"use strict";

var assert = require( 'assert' );
var FlingReceiver = require( '../lib/receive' );
var AbstractReceiverTransport = require( '../lib/transport.receiver.abstract' );

describe( 'transports.receiver', function () {
	generateIntegrationTests( 'transport.receiver.express' );
	generateIntegrationTests( 'transport.receiver.local' );
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

		before( function ( done ) {
			if ( typeof params.init === 'function' ) {
				params.init( done );
			} else {
				done();
			}
		} );

		after( function ( done ) {
			if ( typeof params.dinit === 'function' ) {
				params.dinit( done );
			} else {
				done();
			}
		} );

		it( 'should take an object for a config', function () {
			assert.strictEqual( typeof config, 'object' );
		} );

		it( 'should have a requestEmitter function to simulate input on the transport', function () {
			assert.strictEqual( typeof requestEmitter, 'function' );
		} );

		it( 'should be a constructor', function () {
			assert.strictEqual( typeof Transport, 'function' );
		} );

		it( 'should instantiate w/ defaults', function () {
			transport = new Transport( config );
		} );

		it( 'should inherit the abstract receiver', function () {
			assert.ok( transport instanceof AbstractReceiverTransport );
		} );

		it( 'should init w/ defaults', function ( done ) {

			transport.init( function ( err ) {
				try {
					assert.ifError( err );
					done();
				} catch ( e ) {
					done( e );
				}
			} );

		} );

		it( 'should emit a properly formatted request w/ defaults', function ( done ) {

			try {

				var flingReceiver = new FlingReceiver( {
					baseDir: __dirname + '/rpcModules'
				} );
				flingReceiver.addTransport( transport );

				// simulate a request payload delivered to the transport, and the response
				requestEmitter( {
						jsonrpc: '2.0',
						id:      100,
						method:  'echoModule.action2',
						params:  {
							some:      'string',
							an:        [ 'array' ],
							anInteger: 1,
							another:   {
								object: 'here'
							}
						}
					},
					function ( payload ) {

						try {

							assert.strictEqual( typeof payload, 'object' );
							assert.strictEqual( payload.id, 100 );
							assert.strictEqual( payload.method, undefined );
							assert.strictEqual( payload.error, undefined );
							assert.deepEqual( objToString( payload.result ), objToString( {
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

		it( 'should dinit w/ defaults', function ( done ) {
			transport.dinit( function ( err ) {
				try {
					assert.ifError( err );
					done();
				} catch ( e ) {
					done( e );
				}
			} );
		} );

		var authenticationCount = 0;
		it( 'should instantiate w/ authentication', function () {
			config.authenticate = function ( payload, done ) {
				done( '100' );
				authenticationCount++;
			};
			transport = new Transport( config );
		} );

		it( 'should init w/ authentication', function ( done ) {
			transport.init( function ( err ) {
				try {
					assert.ifError( err );
					done();
				} catch ( e ) {
					done( e );
				}
			} );
		} );

		it( 'should emit a properly formatted request w/ authentication', function ( done ) {

			try {

				var flingReceiver = new FlingReceiver( {
					baseDir: __dirname + '/rpcModules'
				} );
				flingReceiver.addTransport( transport );

				// simulate a request payload delivered to the transport, and the response
				requestEmitter( {
						jsonrpc: '2.0',
						id:      100,
						method:  'echoModule.action2',
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

							assert.strictEqual( authenticationCount, 1 );
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

		it( 'should dinit w/ authentication', function ( done ) {
			transport.dinit( function ( err ) {
				try {
					assert.ifError( err );
					done();
				} catch ( e ) {
					done( e );
				}
			} );
		} );

	} );
}

function objToString( obj ) {
	return JSON.stringify( obj, null, 2 );
}
