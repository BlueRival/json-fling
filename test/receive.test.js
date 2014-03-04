"use strict";

var AbstractReceiverTransport = require( '../lib/transport.receiver.abstract' );
var assert = require( 'assert' );
var FlingReceiver = require( '../lib/receive' );
var Request = require( '../lib/request' );
var Response = require( '../lib/response' );

var FakeTransport = function () {
	AbstractReceiverTransport.apply( this, arguments );
};
require( 'util' ).inherits( FakeTransport, AbstractReceiverTransport );

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

		assert.strictEqual( onField, 'rpc' );
		assert.strictEqual( typeof onFunc, 'function' );
		assert.strictEqual( onCount, 1 );

	} );

	it( 'should respond to a request event with 404 if method action missing, and log it', function ( done ) {

		var logs = [];
		var eventedLogs = [];
		flingReceiver = new FlingReceiver( {
			baseDir: __dirname + '/rpcModules',
			scribe: function ( level, message, data ) {
				logs.push( [level, message, data] );
			}
		} );

		flingReceiver.on( 'log', function ( entry ) {
			eventedLogs.push( entry );
		} );

		var requestId = new Date().getTime();

		// mock a transport
		var transport = new FakeTransport();
		flingReceiver.addTransport( transport );

		var request = new Request( {
			jsonrpc: '2.0',
			id:      requestId,
			method:  'rootModule.missingAction',
			params:  { some: 'values', here: 0 }
		}, {some: 'context'} );

		var response = new Response( requestId );

		// catch the response
		response.on( 'send', function ( payload ) {

			// give logs time to settle
			setImmediate( function () {
				try {

					assert.strictEqual( logs.length, 2 );
					assert.strictEqual( eventedLogs.length, 2 );
					assert.strictEqual( logs[0][0], 'debug' );
					assert.strictEqual( eventedLogs[0].level, 'debug' );
					assert.ok( logs[0][1].match( /^RPC request: [0-9]+$/ ) );
					assert.ok( eventedLogs[0].message.match( /^RPC request: [0-9]+$/ ) );
					assert.deepEqual( logs[0][2], {
						jsonrpc: '2.0',
						id:      requestId,
						method:  'rootModule.missingAction',
						params:  { some: 'values', here: 0 }
					} );
					assert.deepEqual( eventedLogs[0].data, {
						jsonrpc: '2.0',
						id:      requestId,
						method:  'rootModule.missingAction',
						params:  { some: 'values', here: 0 }
					} );
					assert.strictEqual( logs[1][0], 'debug' );
					assert.strictEqual( eventedLogs[1].level, 'debug' );
					assert.ok( logs[1][1].match( /^RPC response: [0-9]+: [0-9]+ms$/ ) );
					assert.ok( eventedLogs[1].message.match( /^RPC response: [0-9]+: [0-9]+ms$/ ) );
					assert.deepEqual( logs[1][2], {
						jsonrpc: '2.0',
						id:      requestId,
						error:   {
							code:    404,
							message: 'method action not found',
							data:    'rootModule.missingAction'
						}
					} );
					assert.deepEqual( eventedLogs[1].data, {
						jsonrpc: '2.0',
						id:      requestId,
						error:   {
							code:    404,
							message: 'method action not found',
							data:    'rootModule.missingAction'
						}
					} );
					assert.strictEqual( payload.jsonrpc, '2.0' );
					assert.strictEqual( payload.id, requestId );
					assert.strictEqual( typeof payload.error, 'object' );
					assert.strictEqual( payload.error.code, 404 );
					assert.strictEqual( payload.error.message, 'method action not found' );
					assert.strictEqual( payload.error.data, 'rootModule.missingAction' );

					done();
				} catch ( e ) {
					done( e );
				}
			} );

		} );

		transport.emit( 'rpc', {
			request:  request,
			response: response
		} );

	} );

	it( 'should respond to a request event with 404 if method module missing', function ( done ) {

		flingReceiver = new FlingReceiver( {
			baseDir: __dirname + '/rpcModules'
		} );

		var requestId = new Date().getTime();

		var transport = new FakeTransport();
		flingReceiver.addTransport( transport );

		var request = new Request( {
			jsonrpc: '2.0',
			id:      requestId,
			method:  'missingModule.missingAction',
			params:  { some: 'values', here: 0 }
		}, {some: 'context'} );

		var response = new Response( requestId );

		// catch the response
		response.on( 'send', function ( payload ) {

			try {

				assert.strictEqual( payload.jsonrpc, '2.0' );
				assert.strictEqual( payload.id, requestId );
				assert.strictEqual( typeof payload.error, 'object' );
				assert.strictEqual( payload.error.code, 404 );
				assert.strictEqual( payload.error.data, null );
				assert.strictEqual( payload.error.message, 'module not found' );

				done();
			} catch ( e ) {
				done( e );
			}
		} );

		transport.emit( 'rpc', {
			request:  request,
			response: response
		} );

	} );

	it( 'should respond to a request event', function ( done ) {

		flingReceiver = new FlingReceiver( {
			baseDir: __dirname + '/rpcModules'
		} );

		var requestId = new Date().getTime();

		var transport = new FakeTransport();
		flingReceiver.addTransport( transport );

		var request = new Request( {
			jsonrpc: '2.0',
			id:      requestId,
			method:  'rootModule.action',
			params:  { some: 'values', here: 0 }
		}, {some: 'context'} );

		var response = new Response( requestId );

		response.on( 'send', function ( payload ) {

			try {
				assert.strictEqual( payload.jsonrpc, '2.0' );
				assert.strictEqual( payload.id, requestId );
				assert.strictEqual( payload.error, undefined );
				assert.deepEqual( stringFormat( payload.result ), stringFormat( {
					some:         'values',
					here:         0,
					injectedData: {
						you: ['should'],
						see: {
							this: 'data '
						}
					} } ) );
				done();
			} catch ( e ) {
				done( e );
			}
		} );

		transport.emit( 'rpc', {
			request:  request,
			response: response
		} );

	} );

	it( 'should pass params to the module.action', function ( done ) {

		flingReceiver = new FlingReceiver( {
			baseDir: __dirname + '/rpcModules'
		} );

		var requestId = new Date().getTime();

		var transport = new FakeTransport();
		flingReceiver.addTransport( transport );

		var request = new Request( {
			jsonrpc: '2.0',
			id:      requestId,
			method:  'echoModule.action',
			params:  { some: 'values', here: 0 }
		}, {some: 'context'} );

		var response = new Response( requestId );

		response.on( 'send', function ( response ) {

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
		} );

		transport.emit( 'rpc', {
			request:  request,
			response: response
		} );


	} );

	it( 'should find modules in sub directories', function ( done ) {

		flingReceiver = new FlingReceiver( {
			baseDir: __dirname + '/rpcModules'
		} );

		var requestId = new Date().getTime();

		var transport = new FakeTransport();
		flingReceiver.addTransport( transport );

		var request = new Request( {
			jsonrpc: '2.0',
			id:      requestId,
			method:  'dir1.dir2.nestedModule.action',
			params:  { some: 'values', here: 0 }
		}, {some: 'context'} );

		var response = new Response( requestId );

		response.on( 'send', function ( response ) {

			try {
				assert.strictEqual( response.jsonrpc, '2.0' );
				assert.strictEqual( response.id, requestId );
				assert.strictEqual( response.error, undefined );
				assert.deepEqual( stringFormat( response.result ), stringFormat( nestedModuleResponse ) );
				done();
			} catch ( e ) {
				done( e );
			}
		} );

		transport.emit( 'rpc', {
			request:  request,
			response: response
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


		var transport = new FakeTransport( {
			authenticate: function ( context, done ) {
				done( {agentId: requestId} );
			}
		} );

		flingReceiver.addTransport( transport );

		var request = new Request( {
			jsonrpc: '2.0',
			id:      requestId,
			method:  'rootModule.action',
			params:  { some: 'values', here: 0 }
		}, {some: 'context'} );

		var response = new Response( requestId );

		response.on( 'send', function ( response ) {

			try {

				assert.deepEqual( lastAuthorization.getPayload(), {
					jsonrpc: '2.0',
					id:      requestId,
					method:  'rootModule.action',
					params:  { some: 'values', here: 0 }
				} );

				assert.strictEqual( stringFormat( lastAuthorization.getAgent() ), stringFormat( {agentId: requestId} ) );

				assert.strictEqual( response.jsonrpc, '2.0' );
				assert.strictEqual( response.id, requestId );
				assert.strictEqual( typeof response.error, 'object' );
				assert.strictEqual( response.error.code, 401 );
				assert.strictEqual( response.error.message, 'not authorized for specified method' );
				assert.strictEqual( response.error.data, 'rootModule.action' );

				assert.deepEqual( response.result, undefined );
				done();
			} catch ( e ) {
				done( e );
			}
		} );

		transport.emit( 'rpc', {
			request:  request,
			response: response
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


		var transport = new FakeTransport( {
			authenticate: function ( context, done ) {
				done( {agentId: requestId} );
			}
		} );

		flingReceiver.addTransport( transport );

		var request = new Request( {
			jsonrpc: '2.0',
			id:      requestId,
			method:  'rootModule.action',
			params:  { some: 'values', here: 0 }
		}, {some: 'context'} );

		var response = new Response( requestId );

		response.on( 'send', function ( response ) {

			try {

				assert.strictEqual( stringFormat( lastAuthorization.getAgent() ), stringFormat( {agentId: requestId} ) );

				assert.strictEqual( response.jsonrpc, '2.0' );
				assert.strictEqual( response.id, requestId );
				assert.strictEqual( typeof response.error, 'undefined' );

				assert.deepEqual( stringFormat( response ), stringFormat( {
					jsonrpc: '2.0',
					id:      requestId,
					result:  {
						some:         'values',
						here:         0,
						injectedData: {
							you: ['should'],
							see: {
								this: 'data '
							}
						}
					}
				} ) );

				done();
			} catch ( e ) {
				done( e );
			}
		} );

		transport.emit( 'rpc', {
			request:  request,
			response: response
		} );

	} );

	it( 'should respond to a request event with the RPC module error codes', function ( done ) {

		flingReceiver = new FlingReceiver( {
			baseDir: __dirname + '/rpcModules'
		} );

		var requestId = new Date().getTime();

		var transport = new FakeTransport();
		flingReceiver.addTransport( transport );

		var request = new Request( {
			jsonrpc: '2.0',
			id:      requestId,
			method:  'errorModule.action',
			params:  { some: 'values', here: 0 }
		}, {some: 'context'} );

		var response = new Response( requestId );
		response.on( 'send', function ( response ) {

			try {

				assert.strictEqual( response.jsonrpc, '2.0' );
				assert.strictEqual( response.id, requestId );
				assert.strictEqual( typeof response.error, 'object' );
				assert.strictEqual( response.error.code, 404 );
				assert.strictEqual( response.error.message, 'you should see this in error.message' );
				assert.strictEqual( response.error.data.string, 'you should see this in error.message.data.string' );

				assert.deepEqual( response.result, undefined );
				done();
			} catch ( e ) {
				done( e );
			}
		} );

		transport.emit( 'rpc', {
			request:  request,
			response: response
		} );

	} );

	it( 'should respond to a request event with the RPC module error codes with multiple errors', function ( done ) {

		flingReceiver = new FlingReceiver( {
			baseDir: __dirname + '/rpcModules'
		} );

		var requestId = new Date().getTime();

		var transport = new FakeTransport();
		flingReceiver.addTransport( transport );

		var request = new Request( {
			jsonrpc: '2.0',
			id:      requestId,
			method:  'errorModule.actionMultiple',
			params:  { some: 'values', here: 0 }
		}, {some: 'context'} );

		var response = new Response( requestId );
		response.on( 'send', function ( response ) {

			try {

				assert.strictEqual( response.jsonrpc, '2.0' );
				assert.strictEqual( response.id, requestId );
				assert.strictEqual( typeof response.error, 'object' );
				assert.strictEqual( response.error.code, 400 );
				assert.strictEqual( response.error.message, 'multiple errors' );
				assert.ok( Array.isArray( response.error.data ) );
				assert.strictEqual( response.error.data.length, 2 );

				assert.strictEqual( response.error.data[0].code, 404 );
				assert.strictEqual( response.error.data[1].code, 404 );

				assert.strictEqual( response.error.data[0].message, 'you should see this in error.data[0].message' );
				assert.strictEqual( response.error.data[1].message, 'you should see this in error.data[1].message' );

				assert.strictEqual( response.error.data[0].data.string, 'you should see this in error.data[0].message.data.string' );
				assert.strictEqual( response.error.data[1].data.string, 'you should see this in error.data[1].message.data.string' );

				assert.deepEqual( response.result, undefined );
				done();
			} catch ( e ) {
				done( e );
			}
		} );

		transport.emit( 'rpc', {
			request:  request,
			response: response
		} );

	} );

	it( 'should respond to a request event with the RPC module error codes even when payload passed to send', function ( done ) {

		flingReceiver = new FlingReceiver( {
			baseDir: __dirname + '/rpcModules'
		} );

		var requestId = new Date().getTime();

		var transport = new FakeTransport();
		flingReceiver.addTransport( transport );

		var request = new Request( {
			jsonrpc: '2.0',
			id:      requestId,
			method:  'errorModule.actionSendPayload',
			params:  { some: 'values', here: 0 }
		}, {some: 'context'} );

		var response = new Response( requestId );
		response.on( 'send', function ( response ) {

			try {

				assert.strictEqual( response.jsonrpc, '2.0' );
				assert.strictEqual( response.id, requestId );
				assert.strictEqual( typeof response.error, 'object' );
				assert.strictEqual( response.error.code, 400 );
				assert.strictEqual( response.error.message, 'multiple errors' );
				assert.ok( Array.isArray( response.error.data ) );
				assert.strictEqual( response.error.data.length, 2 );

				assert.strictEqual( response.error.data[0].code, 404 );
				assert.strictEqual( response.error.data[1].code, 404 );

				assert.strictEqual( response.error.data[0].message, 'you should see this in error.data[0].message' );
				assert.strictEqual( response.error.data[1].message, 'you should see this in error.data[1].message' );

				assert.strictEqual( response.error.data[0].data.string, 'you should see this in error.data[0].message.data.string' );
				assert.strictEqual( response.error.data[1].data.string, 'you should see this in error.data[1].message.data.string' );

				assert.deepEqual( response.result, undefined );
				done();
			} catch ( e ) {
				done( e );
			}
		} );

		transport.emit( 'rpc', {
			request:  request,
			response: response
		} );

	} );

	it( 'should use middleware, and middleware should be able to modify the request', function ( done ) {

		var doned = false;
		var _done = function ( e ) {
			if ( doned ) {
				return;
			}
			doned = true;
			if ( e ) {
				done( e );
			} else {
				done();
			}
		};

		flingReceiver = new FlingReceiver( {
			baseDir: __dirname + '/rpcModules'
		} );

		var mw1Count = 0;
		var mw2Count = 0;
		var mw3Count = 0;

		flingReceiver.use( function ( request, response, next ) {
			try {
				assert.ok( request instanceof Request );
				assert.ok( response instanceof Response );
				assert.strictEqual( mw1Count, 0 );
				assert.strictEqual( mw2Count, 0 );
				assert.strictEqual( mw3Count, 0 );
				assert.strictEqual( request.getParams(), null );
				request.getPayload().params = { one: true };
				mw1Count++;
				next();
			} catch ( e ) {
				_done( e );
			}
		} );

		flingReceiver.use( [ 'not really a middleware ' ] );

		flingReceiver.use( function ( request, response, next ) {
			try {
				assert.ok( request instanceof Request );
				assert.ok( response instanceof Response );
				assert.strictEqual( mw1Count, 1 );
				assert.strictEqual( mw2Count, 0 );
				assert.strictEqual( mw3Count, 0 );
				assert.notStrictEqual( request.getParams(), null );
				assert.strictEqual( typeof request.getParams(), 'object' );
				assert.strictEqual( request.getParams().one, true );
				request.getParams().two = true;
				mw2Count++;
				next();
			} catch ( e ) {
				_done( e );
			}
		} );

		flingReceiver.use( function ( request, response, next ) {
			try {
				assert.ok( request instanceof Request );
				assert.ok( response instanceof Response );
				assert.strictEqual( mw1Count, 1 );
				assert.strictEqual( mw2Count, 1 );
				assert.strictEqual( mw3Count, 0 );
				assert.notStrictEqual( request.getParams(), null );
				assert.strictEqual( typeof request.getParams(), 'object' );
				assert.strictEqual( request.getParams().one, true );
				assert.strictEqual( request.getParams().two, true );
				assert.strictEqual( request.getParams().three, undefined );
				mw3Count++;
				next();
			} catch ( e ) {
				_done( e );
			}
		} );

		var requestId = new Date().getTime();

		var transport = new FakeTransport();
		flingReceiver.addTransport( transport );

		var request = new Request( {
			jsonrpc: '2.0',
			id:      requestId,
			method:  'rootModule.action',
			params:  null
		} );

		var response = new Response( requestId );

		response.on( 'send', function () {
			try {

				assert.strictEqual( mw1Count, 1 );
				assert.strictEqual( mw2Count, 1 );
				assert.strictEqual( mw3Count, 1 );

				_done();
			} catch ( e ) {
				_done( e );
			}
		} );

		transport.emit( 'rpc', {
			request:  request,
			response: response
		} );

	} );

	it( 'should use middleware, and middleware should be able to forward a call to a new method', function ( done ) {

		var doned = false;
		var _done = function ( e ) {
			if ( doned ) {
				return;
			}
			doned = true;
			if ( e ) {
				done( e );
			} else {
				done();
			}
		};

		flingReceiver = new FlingReceiver( {
			baseDir: __dirname + '/rpcModules'
		} );

		var mw1Count = 0;
		var mw2Count = 0;
		var mw3Count = 0;

		flingReceiver.use( function ( request, response, next ) {
			try {
				assert.ok( request instanceof Request );
				assert.ok( response instanceof Response );
				mw1Count++;
				next();
			} catch ( e ) {
				_done( e );
			}
		} );

		flingReceiver.use( function ( request, response, next ) {
			try {
				assert.ok( request instanceof Request );
				assert.ok( response instanceof Response );
				mw2Count++;

				if ( request.getMethod() === 'rootModule.action' ) {
					next( {
						forward: 'rootModule.action2'
					} );
				} else {
					next();
				}
			} catch ( e ) {
				_done( e );
			}
		} );

		flingReceiver.use( function ( request, response, next ) {
			try {
				assert.ok( request instanceof Request );
				assert.ok( response instanceof Response );
				assert.strictEqual( mw1Count, 2 );
				assert.strictEqual( mw2Count, 2 );
				assert.strictEqual( mw3Count, 0 );
				mw3Count++;
				next();
			} catch ( e ) {
				_done( e );
			}
		} );

		var requestId = new Date().getTime();

		var transport = new FakeTransport();
		flingReceiver.addTransport( transport );

		var request = new Request( {
			jsonrpc: '2.0',
			id:      requestId,
			method:  'rootModule.action',
			params:  null
		} );

		var response = new Response( requestId );

		response.on( 'send', function ( payload ) {
			try {

				assert.strictEqual( typeof payload, 'object' );
				assert.notStrictEqual( payload, null );
				assert.strictEqual( payload.result.action, 2 );

				assert.strictEqual( mw1Count, 2 );
				assert.strictEqual( mw2Count, 2 );
				assert.strictEqual( mw3Count, 1 );


				_done();
			} catch ( e ) {
				_done( e );
			}
		} );

		transport.emit( 'rpc', {
			request:  request,
			response: response
		} );

	} );

} );

function stringFormat( input ) {
	return JSON.stringify( input, null, 20 );
}
