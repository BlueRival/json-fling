"use strict";

var assert = require( 'assert' );
var fs = require( 'fs' );

var FlingReceiver = require( '../lib/receive' );

describe( 'Fling Receiver', function () {

  var flingReceiver = null;
  var originalFs = {};

  var fsOverrides = null;

  before( function () {
    originalFs.exists = fs.exists;
    originalFs.existsSync = fs.existsSync;
    originalFs.statSync = fs.statSync;
    originalFs.realPathSync = fs.realpathSync;

    fs.exists = function ( path, done ) {
      done( fsOverrides.exists );
    };

    fs.existsSync = function ( path ) {
      return fsOverrides.exists;
    };

    fs.statSync = function ( path ) {
      return {
        isDirectory: function () {
          return fsOverrides.isDirectory;
        }
      };
    };

    fs.realPathSync = function ( path ) {
      return path;
    };

  } );

  beforeEach( function () {
    fsOverrides = {
      exists:      true,
      isDirectory: true
    };
  } );

  after( function () {
    fs.exists = originalFs.exists;
    fs.existsSync = originalFs.existsSync;
    fs.statSync = originalFs.statSync;
    fs.realPathSync = originalFs.realPathSync;
  } );

  it( 'should fail to instantiate with no parameters', function () {
    try {
      flingReceiver = new FlingReceiver();
      assert.ifError( new Error( 'thrown exception expected' ) );
    } catch ( e ) {
      assert.ok( (e + '').match( /config field baseDir is required/ ) );
    }
  } );

  it( 'should fail to instantiate with baseDir not existing', function () {

    fsOverrides.exists = false;

    try {
      flingReceiver = new FlingReceiver( {
        baseDir: '/base/dir'
      } );
      assert.ifError( new Error( 'thrown exception expected' ) );
    } catch ( e ) {
      assert.ok( (e + '').match( /config field baseDir identifies a missing directory/ ) );
    }
  } );

  it( 'should fail to instantiate with baseDir not a directory', function () {

    fsOverrides.isDirectory = false;

    try {
      flingReceiver = new FlingReceiver( {
        baseDir: '/base/dir'
      } );
      assert.ifError( new Error( 'thrown exception expected' ) );
    } catch ( e ) {
      assert.ok( (e + '').match( /config field baseDir must identify a directory/ ) );
    }
  } );

  it( 'should fail to instantiate with authorize not a function', function () {

    try {
      flingReceiver = new FlingReceiver( {
        baseDir:   '/base/dir',
        authorize: 'function'
      } );
      assert.ifError( new Error( 'thrown exception expected' ) );
    } catch ( e ) {
      assert.ok( (e + '').match( /config field authorize must be a function if supplied/ ) );
    }
  } );

  it( 'should instantiate with baseDir set', function () {
    flingReceiver = new FlingReceiver( {
      baseDir: '/base/dir'
    } );
  } );

  it( 'should instantiate with authorize set', function () {
    flingReceiver = new FlingReceiver( {
      baseDir:   '/base/dir',
      authorize: function () {
        // NO-OP
      }
    } );
  } );

  it( 'should add a transport once', function () {

    flingReceiver = new FlingReceiver( {
      baseDir: '/base/dir'
    } );

    var onField = null;
    var onFunc = null;
    var onCount = 0;

    var transport = {
      on: function ( field, func ) {
        onField = field;
        onFunc = func;
        onCount++;
      }
    };

    flingReceiver.addTransport( transport );
    flingReceiver.addTransport( transport );
    flingReceiver.addTransport( transport );

    assert.strictEqual( onField, 'request' );
    assert.strictEqual( typeof onFunc, 'function' );
    assert.strictEqual( onCount, 1 );

  } );

  it( 'should respond to a request event with 404 if method action missing', function ( done ) {

    flingReceiver = new FlingReceiver( {
      baseDir: '/base/dir'
    } );

    var requestId = new Date().getTime();
    var responseData = {
      some: ['data', 'goes', 'here'],
      in:   {
        any: 'format'
      }
    };

    var onRequestFunc = function () {
      // NO-OP
    };

    // mock the RPC module
    flingReceiver._require = function ( path ) {

      if ( path === '/base/dir/domain/module1/module2' ) {
        return {};
      } else {
        return require( '../lib/' + path );
      }

    };

    // mock a transport
    flingReceiver.addTransport( {
      on: function ( field, func ) {
        if ( field === 'request' ) {
          onRequestFunc = func;
        }
      }
    } );

    // simulate a request event on the mock transport
    onRequestFunc( {
      agentId:  'sess_1234567890',
      payload:  {
        jsonrpc: '2.0',
        id:      requestId,
        method:  'domain.module1.module2.action',
        params:  { some: 'values', here: 0 }
      },
      response: function ( response ) {

        try {

          assert.strictEqual( response.jsonrpc, '2.0' );
          assert.strictEqual( response.id, requestId );
          assert.strictEqual( typeof response.error, 'object' );
          assert.strictEqual( response.error.code, 404 );
          assert.strictEqual( response.error.message, 'Method action not found' );
          assert.strictEqual( response.error.data, null );

          done();
        } catch ( e ) {
          done( e );
        }

      }
    } );

  } );

  it( 'should respond to a request event with 404 if method module missing', function ( done ) {

    flingReceiver = new FlingReceiver( {
      baseDir: '/base/dir'
    } );

    var requestId = new Date().getTime();
    var responseData = {
      some: ['data', 'goes', 'here'],
      in:   {
        any: 'format'
      }
    };

    var onRequestFunc = function () {
      // NO-OP
    };

    // mock the RPC module
    flingReceiver._require = function ( path ) {

      if ( path === '/base/dir/domain/module1/module3' ) {
        return {
          'action': function ( params, done ) {
            done( 200, responseData );
          }
        };
      } else {
        return require( '../lib/' + path );
      }

    };

    fsOverrides.exists = false;

    // mock a transport
    flingReceiver.addTransport( {
      on: function ( field, func ) {
        if ( field === 'request' ) {
          onRequestFunc = func;
        }
      }
    } );

    // simulate a request event on the mock transport
    onRequestFunc( {
      agentId:  'sess_1234567890',
      payload:  {
        jsonrpc: '2.0',
        id:      requestId,
        method:  'domain.module1.module3.action',
        params:  { some: 'values', here: 0 }
      },
      response: function ( response ) {

        try {

          assert.strictEqual( response.jsonrpc, '2.0' );
          assert.strictEqual( response.id, requestId );
          assert.strictEqual( typeof response.error, 'object' );
          assert.strictEqual( response.error.code, 404 );
          assert.strictEqual( response.error.data, null );
          assert.strictEqual( response.error.message, 'Module not found' );

          done();
        } catch ( e ) {
          done( e );
        }

      }
    } );

  } );

  it( 'should respond to a request event', function ( done ) {

    flingReceiver = new FlingReceiver( {
      baseDir: '/base/dir'
    } );

    var requestId = new Date().getTime();
    var responseData = {
      some: ['data', 'goes', 'here'],
      in:   {
        any: 'format'
      }
    };

    var onRequestFunc = function () {
      // NO-OP
    };

    // mock the RPC module
    flingReceiver._require = function ( path ) {

      if ( path === '/base/dir/domain/module1/module2' ) {
        return {
          'action': function ( params, done ) {
            done( 200, responseData );
          }
        };
      } else {
        return require( '../lib/' + path );
      }

    };

    // mock a transport
    flingReceiver.addTransport( {
      on: function ( field, func ) {
        if ( field === 'request' ) {
          onRequestFunc = func;
        }
      }
    } );

    // simulate a request event on the mock transport
    onRequestFunc( {
      agentId:  'sess_1234567890',
      payload:  {
        jsonrpc: '2.0',
        id:      requestId,
        method:  'domain.module1.module2.action',
        params:  { some: 'values', here: 0 }
      },
      response: function ( response ) {

        try {
          assert.strictEqual( response.jsonrpc, '2.0' );
          assert.strictEqual( response.id, requestId );
          assert.strictEqual( response.error, undefined );
          assert.deepEqual( response.result, responseData );
          done();
        } catch ( e ) {
          done( e );
        }
      }
    } );

  } );

  it( 'should block an unauthorized agent', function ( done ) {

    flingReceiver = new FlingReceiver( {
      baseDir:   '/base/dir',
      authorize: function ( agentId, done ) {
        done( false );
      }
    } );

    var requestId = new Date().getTime();
    var responseData = {
      some: ['data', 'goes', 'here'],
      in:   {
        any: 'format'
      }
    };

    var onRequestFunc = function () {
      // NO-OP
    };

    // mock the RPC module
    flingReceiver._require = function ( path ) {

      if ( path === '/base/dir/domain/module1/module2' ) {
        return {
          'action': function ( params, done ) {
            done( 200, responseData );
          }
        };
      } else {
        return require( '../lib/' + path );
      }

    };

    // mock a transport
    flingReceiver.addTransport( {
      on: function ( field, func ) {
        if ( field === 'request' ) {
          onRequestFunc = func;
        }
      }
    } );

    // simulate a request event on the mock transport
    onRequestFunc( {
      agentId:  'sess_1234567890',
      payload:  {
        jsonrpc: '2.0',
        id:      requestId,
        method:  'domain.module1.module2.action',
        params:  { some: 'values', here: 0 }
      },
      response: function ( response ) {

        try {
          assert.strictEqual( response.jsonrpc, '2.0' );
          assert.strictEqual( response.id, requestId );
          assert.strictEqual( typeof response.error, 'object' );
          assert.strictEqual( response.error.code, 401 );
          assert.strictEqual( response.error.message, 'Not authorized for specified method' );
          assert.strictEqual( response.error.data, 'domain.module1.module2.action' );

          assert.deepEqual( response.result, undefined );
          done();
        } catch ( e ) {
          done( e );
        }
      }
    } );

  } );

  it( 'should allow an authorized agent', function ( done ) {

    flingReceiver = new FlingReceiver( {
      baseDir:   '/base/dir',
      authorize: function ( agentId, method, done ) {
        done( true );
      }
    } );

    var requestId = new Date().getTime();
    var responseData = {
      some: ['data', 'goes', 'here'],
      in:   {
        any: 'format'
      }
    };

    var onRequestFunc = function () {
      // NO-OP
    };

    // mock the RPC module
    flingReceiver._require = function ( path ) {

      if ( path === '/base/dir/domain/module1/module2' ) {
        return {
          'action': function ( params, done ) {
            done( 200, responseData );
          }
        };
      } else {
        return require( '../lib/' + path );
      }

    };

    // mock a transport
    flingReceiver.addTransport( {
      on: function ( field, func ) {
        if ( field === 'request' ) {
          onRequestFunc = func;
        }
      }
    } );

    // simulate a request event on the mock transport
    onRequestFunc( {
      agentId:  'sess_1234567890',
      payload:  {
        jsonrpc: '2.0',
        id:      requestId,
        method:  'domain.module1.module2.action',
        params:  { some: 'values', here: 0 }
      },
      response: function ( response ) {

        try {
          assert.strictEqual( response.jsonrpc, '2.0' );
          assert.strictEqual( response.id, requestId );
          assert.strictEqual( response.error, undefined );
          assert.deepEqual( response.result, responseData );
          done();
        } catch ( e ) {
          done( e );
        }
      }
    } );

  } );

  it( 'should respond to a request event with the RPC module codes', function ( done ) {

    flingReceiver = new FlingReceiver( {
      baseDir: '/base/dir'
    } );

    var requestId = new Date().getTime();

    var onRequestFunc = function () {
      // NO-OP
    };

    var errorMessage = 'could not find the thing you wanted';

    // mock the RPC module
    flingReceiver._require = function ( path ) {

      if ( path === '/base/dir/domain/module1/module2' ) {
        return {
          'action': function ( params, done ) {
            done( 404, errorMessage );
          }
        };
      } else {
        return require( '../lib/' + path );
      }

    };

    // mock a transport
    flingReceiver.addTransport( {
      on: function ( field, func ) {
        if ( field === 'request' ) {
          onRequestFunc = func;
        }
      }
    } );

    // simulate a request event on the mock transport
    onRequestFunc( {
      agentId:  'sess_1234567890',
      payload:  {
        jsonrpc: '2.0',
        id:      requestId,
        method:  'domain.module1.module2.action',
        params:  { some: 'values', here: 0 }
      },
      response: function ( response ) {

        try {
          assert.strictEqual( response.jsonrpc, '2.0' );
          assert.strictEqual( response.id, requestId );
          assert.strictEqual( typeof response.error, 'object' );
          assert.strictEqual( response.error.code, 404 );
          assert.strictEqual( response.error.message, errorMessage );
          assert.strictEqual( response.error.data, null );
          assert.strictEqual( response.result, undefined );
          done();
        } catch ( e ) {
          done( e );
        }
      }
    } );

  } );

} );
