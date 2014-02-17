"use strict";

var assert = require( 'assert' );

var FlingReceiver = require( '../lib/receive' );

var rootModuleResponse = {
	module: 'root',
	other:  [ 'data' ]
};
var nestedModuleResponse = {
	module: 'nested',
	other:  [ 'data' ]
};

describe( 'Fling Receiver', function () {

	var flingReceiver = null;

	it( 'should fail to instantiate with no parameters', function () {
		try {
			flingReceiver = new FlingReceiver();
			assert.ifError( new Error( 'thrown exception expected, but did not fire' ) );
		} catch ( e ) {
			assert.ok( (e + '').match( /config field baseDir is required/ ) );
		}
	} );

	it( 'should fail to instantiate with baseDir not existing', function () {

		try {
			flingReceiver = new FlingReceiver( {
				baseDir: '/bad/base/dir'
			} );
			assert.ifError( new Error( 'thrown exception expected, but did not fire' ) );
		} catch ( e ) {
			assert.ok( (e + '').match( /config field baseDir identifies a missing directory/ ) );
		}
	} );

	it( 'should fail to instantiate with baseDir not a directory', function () {

		try {
			flingReceiver = new FlingReceiver( {
				baseDir: __filename
			} );
			assert.ifError( new Error( 'thrown exception expected, but did not fire' ) );
		} catch ( e ) {
			assert.ok( (e + '').match( /config field baseDir must identify a directory/ ), 'Actual error: ' + e );
		}
	} );

	it( 'should fail to instantiate with authorize not a function', function () {

		try {
			flingReceiver = new FlingReceiver( {
				baseDir:   __dirname,
				authorize: 'function'
			} );
			assert.ifError( new Error( 'thrown exception expected' ) );
		} catch ( e ) {
			assert.ok( (e + '').match( /config field authorize must be a function if supplied/ ) );
		}
	} );

	it( 'should instantiate with baseDir set', function () {
		flingReceiver = new FlingReceiver( {
			baseDir: __dirname
		} );
	} );

	it( 'should instantiate with authorize set', function () {
		flingReceiver = new FlingReceiver( {
			baseDir:   __dirname,
			authorize: function () {
				// NO-OP
			}
		} );
	} );

	it( 'should add a transport once', function () {

		flingReceiver = new FlingReceiver( {
			baseDir: __dirname
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
			baseDir: __dirname + '/rpcModules'
		} );

		var requestId = new Date().getTime();

		var onRequestFunc = function () {
			// NO-OP
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
				method:  'rootModule.missingAction',
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
			baseDir: __dirname + '/rpcModules'
		} );

		var requestId = new Date().getTime();

		var onRequestFunc = function () {
			// NO-OP
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
				method:  'missingModule.missingAction',
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
			baseDir: __dirname + '/rpcModules'
		} );

		var requestId = new Date().getTime();

		var onRequestFunc = function () {
			// NO-OP
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
				method:  'rootModule.action',
				params:  { some: 'values', here: 0 }
			},
			response: function ( response ) {

				try {
					assert.strictEqual( response.jsonrpc, '2.0' );
					assert.strictEqual( response.id, requestId );
					assert.strictEqual( response.error, undefined );
					assert.deepEqual( stringFormat( response.result ), stringFormat( rootModuleResponse ) );
					done();
				} catch ( e ) {
					done( e );
				}
			}
		} );

	} );

	it( 'should pass params to the module.action', function ( done ) {

		flingReceiver = new FlingReceiver( {
			baseDir: __dirname + '/rpcModules'
		} );

		var requestId = new Date().getTime();

		var onRequestFunc = function () {
			// NO-OP
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
				method:  'echoModule.action',
				params:  { some: 'values', here: 0 }
			},
			response: function ( response ) {

				try {
					assert.strictEqual( response.jsonrpc, '2.0' );
					assert.strictEqual( response.id, requestId );
					assert.strictEqual( response.error, undefined );
					assert.deepEqual( stringFormat( response.result ), stringFormat( {
						yourParams: {
							some: 'values',
							here: 0
						},
						newData:    {
							hi: 'there'
						}
					} ) );
					done();
				} catch ( e ) {
					done( e );
				}
			}
		} );

	} );

	it( 'should find modules in sub directories', function ( done ) {

		flingReceiver = new FlingReceiver( {
			baseDir: __dirname + '/rpcModules'
		} );

		var requestId = new Date().getTime();

		var onRequestFunc = function () {
			// NO-OP
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
				method:  'dir1.dir2.nestedModule.action',
				params:  { some: 'values', here: 0 }
			},
			response: function ( response ) {

				try {
					assert.strictEqual( response.jsonrpc, '2.0' );
					assert.strictEqual( response.id, requestId );
					assert.strictEqual( response.error, undefined );
					assert.deepEqual( stringFormat( response.result ),
						stringFormat( nestedModuleResponse ) );
					done();
				} catch ( e ) {
					done( e );
				}
			}
		} );

	} );

	it( 'should block an unauthorized agent', function ( done ) {

		var lastAuthorization = null;
		flingReceiver = new FlingReceiver( {
			baseDir: __dirname + '/rpcModules',
			authorize: function ( request, done ) {
				lastAuthorization = request;
				done( false );
			}
		} );

		var requestId = new Date().getTime();

		var onRequestFunc = function () {
			// NO-OP
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
				method:  'rootModule.action',
				params:  { some: 'values', here: 0 }
			},
			response: function ( response ) {

				try {

					assert.deepEqual( lastAuthorization, {
						agentId: 'sess_1234567890',
						payload: {
							jsonrpc: '2.0',
							id:      requestId,
							method:  'rootModule.action',
							params:  { some: 'values', here: 0 }
						}
					} );

					assert.strictEqual( response.jsonrpc, '2.0' );
					assert.strictEqual( response.id, requestId );
					assert.strictEqual( typeof response.error, 'object' );
					assert.strictEqual( response.error.code, 401 );
					assert.strictEqual( response.error.message, 'Not authorized for specified method' );
					assert.strictEqual( response.error.data, 'rootModule.action' );

					assert.deepEqual( response.result, undefined );
					done();
				} catch ( e ) {
					done( e );
				}
			}
		} );

	} );

	it( 'should allow an authorized agent', function ( done ) {

		var lastAuthorization = null;
		flingReceiver = new FlingReceiver( {
			baseDir: __dirname + '/rpcModules',
			authorize: function ( request, done ) {
				lastAuthorization = request;
				done( true );
			}
		} );

		var requestId = new Date().getTime();

		var onRequestFunc = function () {
			// NO-OP
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
				method:  'rootModule.action',
				params:  { some: 'values', here: 0 }
			},
			response: function ( response ) {

				try {
					assert.deepEqual( lastAuthorization, {
						agentId: 'sess_1234567890',
						payload: {
							jsonrpc: '2.0',
							id:      requestId,
							method:  'rootModule.action',
							params:  { some: 'values', here: 0 }
						}
					} );
					assert.strictEqual( response.jsonrpc, '2.0' );
					assert.strictEqual( response.id, requestId );
					assert.strictEqual( response.error, undefined );
					assert.deepEqual( response.result, rootModuleResponse );
					done();
				} catch ( e ) {
					done( e );
				}
			}
		} );

	} );

	it( 'should respond to a request event with the RPC module error codes', function ( done ) {

		flingReceiver = new FlingReceiver( {
			baseDir: __dirname + '/rpcModules'
		} );

		var requestId = new Date().getTime();

		var onRequestFunc = function () {
			// NO-OP
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
				method:  'errorModule.action',
				params:  { some: 'values', here: 0 }
			},
			response: function ( response ) {

				try {
					assert.strictEqual( response.jsonrpc, '2.0' );
					assert.strictEqual( response.id, requestId );
					assert.strictEqual( typeof response.error, 'object' );
					assert.strictEqual( response.error.code, 404 );
					assert.strictEqual( response.error.message, 'you should see this in error.message' );
					assert.deepEqual( response.error.data, { string: 'you should see this in error.message.data.string' } );
					assert.strictEqual( response.result, undefined );
					done();
				} catch ( e ) {
					done( e );
				}
			}
		} );

	} );

} );

function stringFormat( input ) {
	return JSON.stringify( input, null, 20 );
}
