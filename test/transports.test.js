"use strict";

var assert = require( 'assert' );

describe( 'transports.receiver', function () {
  generateIntegrationTests( 'transport.receiver.express' );
} );

//describe( 'transports.sender', function () {
//
//} );

/**
 * Load the transport test suite configuration for the named transport
 *
 * The test suite configuration must export a function
 *
 * @param name The name of the file containing the configuration function
 */
function generateIntegrationTests( name ) {

  describe( name, function () {

    var params = require( './' + name );

    var Transport = params.constructor;
    var config = params.config;
    var requestEmitter = params.requestEmitter;

    var transport = null;

    it( 'should take an object for a config', function () {
      assert.strictEqual( typeof config, 'object' );
    } );

    it( 'should have a requestEmitter function to simulate input on the transport', function () {
      assert.strictEqual( typeof requestEmitter, 'function' );
    } );

    it( 'should be a constructor', function () {
      assert.strictEqual( typeof Transport, 'function' );
    } );

    it( 'should instantiate', function () {
      transport = new Transport( config );
    } );

    it( 'should init', function ( done ) {
      transport.init( function ( err ) {
        try {
          assert.ifError( err );
          done();
        } catch ( e ) {
          done( e );
        }
      } );
    } );

    it( 'should dinit', function ( done ) {
      transport.dinit( function ( err ) {
        try {
          assert.ifError( err );
          done();
        } catch ( e ) {
          done( e );
        }
      } );
    } );

    it( 'should emit a properly formatted request', function ( done ) {

      try {

        // simulate adding the transport instance to a FlingerReceiver instance
        transport.on( 'request', fakeReceiver( done ) );

        // simulate a request payload delivered to the transport, and the response
        requestEmitter( {
            jsonrpc: '2.0',
            id:      100,
            method:  'test.module1.module2.action',
            params:  {
              some:      'string',
              an:        [ 'array' ],
              anInteger: 1,
              another:   {
                object: 'here'
              }
            }
          },
          function ( response ) {

            try {

              assert.strictEqual( typeof response, 'object' );
              assert.strictEqual( response.id, 100 );
              assert.strictEqual( response.method, undefined );
              assert.strictEqual( response.error, undefined );
              assert.deepEqual( objToString( response.result ), objToString( {
                some:      'string',
                an:        [ 'array' ],
                anInteger: 1,
                another:   {
                  object: 'here'
                }
              } ) );

              done();
            } catch ( e ) {
              done( e );
            }

          } );

      } catch ( e ) {
        done( e );
      }
    } );

  } );
}

function fakeReceiver( done ) {

  return function ( request ) {
    try {

      assert.strictEqual( typeof request, 'object' );

      assert.strictEqual( typeof request.response, 'function' );

      assert.strictEqual( typeof request.payload, 'object' );
      assert.strictEqual( typeof request.payload.method, 'string' );
      assert.ok( request.payload.hasOwnProperty( 'id' ) );
      assert.ok( request.payload.hasOwnProperty( 'params' ) );

      setImmediate( function () {
        request.response( {
          jsonrpc: '2.0',
          id:      request.payload.id,
          result:  request.payload.params
        } );
      } );

    } catch ( e ) {
      done( e );
    }
  };

}

function objToString( obj ) {
  return JSON.stringify( obj, null, 2 );
}
