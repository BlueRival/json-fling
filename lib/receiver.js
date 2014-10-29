"use strict";

var async = require( 'async' );
var EventEmitter = require( 'events' ).EventEmitter;
var fs = require( 'fs' );
var Request = require( './request' );
var Response = require( './response' );
var rpcCount = 0;

var getStackTrace = function () {
	var obj = {};
	Error.captureStackTrace( obj, getStackTrace );
	return obj.stack;
};

var FlingReceiver = function ( config ) {

	var self = this;
	EventEmitter.call( this );

	config = config || {};

	self._config = config;
	self._transports = [];

	if ( !self._config.baseDir ) {
		throw new Error( 'config field baseDir is required' );
	}

	if ( !fs.existsSync( self._config.baseDir ) ) {
		throw new Error( 'config field baseDir identifies a missing directory: ' + self._config.baseDir );
	}

	var baseDirStat = fs.statSync( self._config.baseDir );
	if ( !baseDirStat.isDirectory() ) {
		throw new Error( 'config field baseDir must identify a directory: ' + self._config.baseDir );
	}

	if ( self._config.hasOwnProperty( 'authorize' ) && typeof self._config.authorize !== 'function' ) {
		throw new Error( 'config field authorize must be a function if supplied' );
	}

	// normalize path and slashes
	self._config.baseDir = ('/' + fs.realpathSync( self._config.baseDir ) + '/').replace( /\/\/+/g, '/' );

	self._scribe = function ( level, message, data ) {

		self._log.apply( self, arguments );

		if ( typeof self._config.scribe === 'function' ) {
			self._config.scribe.apply( self._config, arguments );
		}

	};

	self._moduleCache = {};
	self._middleware = [];

	self._require = null;

};
require( 'util' ).inherits( FlingReceiver, EventEmitter );

FlingReceiver.prototype.use = function ( method ) {
	if ( typeof method === 'function' ) {
		this._middleware.push( method );
	}
};

FlingReceiver.prototype.addTransport = function ( transport ) {

	var existingEntry = this._selectTransportEntry( transport );

	// don't add twice
	if ( existingEntry === null ) {

		var handler = this._generateRpcHandler( transport );

		this._transports.push( {
			transport: transport,
			handler:   handler
		} );

		transport.on( 'rpc', handler );

		this.emit( 'addTransport', transport );

	}

};

FlingReceiver.prototype.init = function ( done ) {

	async.each( this._transports, function( transWrapper, next ) {
		transWrapper.transport.init( next );
	}, done );

};

FlingReceiver.prototype._selectTransportEntry = function ( transport ) {

	for ( var i = 0; i < this._transports.length; i++ ) {
		if ( this._transports[i].transport === transport ) {
			return this._transports[i];
		}
	}

	return null;
};

FlingReceiver.prototype._generateRpcHandler = function ( transport ) {
	var self = this;

	// preserve context
	return function ( rpc ) {
		self._handleRequest( transport, rpc );
	};

};

FlingReceiver.prototype._handleRequest = function ( transport, rpc ) {

	var self = this;

	var method = null;

	var requestNumber = ++rpcCount;

	if ( !rpc.requestNumber ) {
		rpc.requestNumber = requestNumber + '';
	} else {
		rpc.requestNumber = requestNumber + '.' + rpc.requestNumber;
	}

	requestNumber = rpc.requestNumber;

	var tasks = {
		validateResponseObject: function ( done ) {

			if ( !(rpc.response instanceof Response) ) {
				self._scribe( 'error', 'transport failed to produce a Response object', getStackTrace() );
			} else {
				done( null, true );
			}

		},
		startLogging:           function ( done ) {

			var start = new Date().getTime();
			var payload;

			if ( rpc && rpc.request && typeof rpc.request.getPayload === 'function' ) {
				payload = rpc.request.getPayload();
			}

			self._scribe( 'debug', 'RPC request: ' + requestNumber + '', payload );

			rpc.response.once( 'send', function ( response ) {

				var stop = new Date().getTime();

				self._scribe( 'debug', 'RPC response: ' + requestNumber + ': ' + (stop - start) + 'ms', response );

			} );

			done( null, true );

		},
		validateRequestObject:  function ( done ) {

			if ( !(rpc.request instanceof Request) ) {
				done( {
					code:    500,
					message: 'transport failed to produce a Request object',
					data:    null
				} );
			} else {
				done( null, true );
			}

		},
		validateRequestSchema:  function ( done ) {
			self._validateRequestSchema( rpc.request.getPayload(), done );
		},
		authenticateRequest:    function ( done ) {

			// don't authenticate twice on forwards
			if ( rpc.request.hasAgent() ) {
				done( null, true );
				return;
			}

			transport.authenticate( rpc.request.getContext(), function ( agent ) {
				rpc.request.setAgent( agent );
				done( null, true );
			} );

		},
		authorizeRequest:       function ( done ) {

			// we still want to authorize
			self._authorize( rpc.request, function ( authorized ) {

				if ( authorized ) {
					done( null, true );
				} else {
					done( {
						code:    401,
						message: 'not authorized for specified method',
						data:    rpc.request.getMethod()
					} );
				}

			} );

		},
		parseRequestMethod:     function ( done ) {
			method = {
				module: rpc.request.getMethod().replace( /\.[^\.]*$/, '' ).trim().replace( /^\./, '' ).replace( /\.$/, '' ),
				action: rpc.request.getMethod().replace( /^.*\./, '' ).trim()
			};

			done( null, true );

		},
		getRequestModule:       function ( done ) {
			self._getModule( method.module, function ( err, module ) {

				if ( err ) {
					done( {
						code:    500,
						message: 'module failed to load',
						data:    (err + '')
					} );
				} else if ( module ) {
					method.module = module;
					done( null, true );
				} else {
					done( {
						code:    404,
						message: 'module not found',
						data:    null
					} );
				}
			} );

		},
		executeRequest:         function ( done ) {

			if ( typeof method.module[method.action] === 'function' ) {

				var middleware = [];
				for ( var i = 0; i < self._middleware.length; i++ ) {
					middleware.push( self._middleware[i] );
				}

				middleware.push( function ( request, response, next ) {
					method.module[method.action]( request, response, next );
				} );

				self._executeMiddleware( transport, middleware, rpc, done );

			} else {

				done( {
					code:    404,
					message: 'method action not found',
					data:    rpc.request.getMethod()
				} );

			}

		}
	};

	async.series( tasks, function ( err, result ) {

		if ( err ) {
			rpc.response.addError( err.code, err.message, err.data );
			rpc.response.send();
		}


	} );

};

FlingReceiver.prototype._executeMiddleware = function ( transport, middleware, rpc, done ) {

	var self = this;
	var executeMiddleware = function ( i ) {

		// if there is no more middleware, we are done
		if ( i > (middleware.length - 1) ) {
			return;
		}

		try {

			middleware[i]( rpc.request, rpc.response, function ( cmd ) {
				cmd = cmd || {};

				if ( arguments.length > 0 ) {

					if ( typeof cmd.forward === 'string' ) {

						// execute as if the request was new
						setImmediate( function () {

							try {
								rpc.request.getPayload().method = cmd.forward;
								self._handleRequest( transport, rpc );
							} catch ( e ) {
								// NO-OP
							}
						} );

						// tell this handler to abort
						done( null, true );

					} else {

						// there was a command passed, but did not match any expected values
						done( {
							code:    500,
							message: 'middleware called next with illegal command',
							data:    { cmd: cmd }
						} );

					}
				} else {

					executeMiddleware( i + 1 );

				}
			} );

		} catch ( e ) {

			done( {
				code:    500,
				message: ('failed to execute method with: ' + e.message),
				data:    e.stack
			} );
		}

	};

	executeMiddleware( 0 );

};

FlingReceiver.prototype._validateRequestSchema = function ( payload, done ) {

	if ( !payload || typeof payload !== 'object' ) {
		done( {
			code:    500,
			message: 'internal Error: transport failed to return a payload object',
			data:    (typeof payload)
		} );
		return;
	}

	if ( !payload.hasOwnProperty( 'jsonrpc' ) ) {
		done( {
			code:    400,
			message: 'required Field: jsonrpc',
			data:    payload
		} );
		return;
	}

	if ( payload.jsonrpc !== '2.0' ) {
		done( {
			code: 400,
			message: 'unsupported Protocol Version: JSON RPC ' + payload.jsonrpc,
			data: payload.jsonrpc
		} );
		return;
	}

	if ( !payload.hasOwnProperty( 'id' ) ) {
		done( {
			code:    400,
			message: 'required Field: id',
			data:    payload
		} );
		return;
	}

	if ( !payload.hasOwnProperty( 'method' ) ) {
		done( {
			code:    400,
			message: 'required Field: method',
			data:    payload
		} );
		return;
	}

	if ( !payload.method || payload.method.length < 1 ) {
		done( {
			code:    400,
			message: 'required Field: method can not be an empty string',
			data:    payload.method
		} );
		return;
	}

	if ( !payload.hasOwnProperty( 'params' ) ) {
		done( {
			code:    400,
			message: 'required Field: params must be supplied',
			data:    payload
		} );
		return;
	}

	done( null, true );

};

FlingReceiver.prototype._getModule = function ( path, done ) {

	var self = this;

	var _require = self._require ? self._require : require;
	var modulePath = self._config.baseDir + path.replace( /\./g, '/' );

	var _done = function () {
		if ( self._moduleCache[modulePath].error ) {
			done( self._moduleCache[modulePath].error );
		} else {
			done( null, self._moduleCache[modulePath].module );
		}
	};

	if ( self._moduleCache.hasOwnProperty( modulePath ) ) {

		_done();

	} else {

		var moduleExists = function () {
			try {

				self._moduleCache[modulePath] = {
					module: _require( modulePath )
				};

			} catch ( e ) {

				self._moduleCache[modulePath] = {
					error: e
				};

			}
		};

		fs.exists( modulePath, function ( exists ) {
			if ( exists ) {
				moduleExists();
				_done();

			} else {
				fs.exists( modulePath + '.js', function ( exists ) {

					if ( exists ) {
						moduleExists();
					} else {
						self._moduleCache[modulePath] = {
							module: null
						};
					}

					_done();

				} );
			}
		} );

	}

};

FlingReceiver.prototype._authorize = function ( request, done ) {
	if ( this._config.authorize ) {
		try {
			this._config.authorize( request, function ( authorized ) {
				setImmediate( done, authorized );
			} );
		} catch ( e ) {
			done( false );
		}
	} else {
		done( true );
	}
};

FlingReceiver.prototype._log = function ( level, message, data ) {

	this.emit( 'log', {
		level:   level,
		message: message,
		data:    data
	} );

};

module.exports = FlingReceiver;
