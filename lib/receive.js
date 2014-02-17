"use strict";

var async = require( 'async' );
var EventEmitter = require( 'events' ).EventEmitter;
var fs = require( 'fs' );
var Timer = require( './timer' );

var FlingReceiver = function ( config ) {

	EventEmitter.call( this );

	config = config || {};

	this._config = config;
	this._transports = [];

	if ( !this._config.baseDir ) {
		throw new Error( 'config field baseDir is required' );
	}

	if ( !fs.existsSync( this._config.baseDir ) ) {
		throw new Error( 'config field baseDir identifies a missing directory: ' + this._config.baseDir );
	}

	var baseDirStat = fs.statSync( this._config.baseDir );
	if ( !baseDirStat.isDirectory() ) {
		throw new Error( 'config field baseDir must identify a directory: ' + this._config.baseDir );
	}

	if ( this._config.hasOwnProperty( 'authorize' ) && typeof this._config.authorize !== 'function' ) {
		throw new Error( 'config field authorize must be a function if supplied' );
	}

	// normalize path and slashes
	this._config.baseDir = ('/' + fs.realpathSync( this._config.baseDir ) + '/').replace( /\/\/+/g, '/' );

	this._moduleCache = {};

	this._require = null;

};
require( 'util' ).inherits( FlingReceiver, EventEmitter );

FlingReceiver.prototype.addTransport = function ( transport ) {
	var self = this;
	var existingEntry = self._selectTransportEntry( transport );

	// don't add twice
	if ( existingEntry === null ) {

		var handler = self._generateRequestHandler();

		try {

			transport.on( 'request', handler );

			self._transports.push( {
				transport: transport,
				handler:   handler
			} );


		} catch ( e ) {
			// NO-OP
		}

		self.emit( 'addTransport', transport );

	}

};

FlingReceiver.prototype._selectTransportEntry = function ( transport ) {

	for ( var i = 0; i < this._transports.length; i++ ) {
		if ( this._transports[i].transport === transport ) {
			return this._transports[i];
		}
	}

	return null;
};

FlingReceiver.prototype._generateRequestHandler = function () {
	var self = this;

	// preserve context
	return function ( request ) {

		self._handleRequest( request );
	};

};

FlingReceiver.prototype._handleRequest = function ( request ) {

	var self = this;

	var timer = new Timer();
	var method = null;

	var tasks = {
		validateRequestSchema: function ( done ) {

			self._validateRequestSchema( request, done );

		},
		authorizeRequest:      function ( done ) {

			self._authorize( request, function ( authorized ) {

				if ( authorized ) {
					done( null, true );
				} else {
					done( {
						code:    401,
						message: 'Not authorized for specified method',
						data:    request.payload.method
					} );
				}

			} );

		},
		parseRequestMethod:    function ( done ) {

			method = {
				module: request.payload.method.replace( /\.[^\.]*$/, '' ).trim().replace( /^\./, '' ).replace( /\.$/, '' ),
				action: request.payload.method.replace( /^.*\./, '' ).trim()
			};

			done( null, true );

		},
		getRequestModule:      function ( done ) {

			self._getModule( method.module, function ( err, module ) {

				if ( err ) {
					done( {
						code:    500,
						message: 'Module failed to load',
						data:    (err + '')
					} );
				} else if ( module ) {
					method.module = module;
					done( null, true );
				} else {
					done( {
						code:    404,
						message: 'Module not found',
						data:    null
					} );
				}
			} );

		},
		executeRequest:        function ( done ) {
			if ( typeof method.module[method.action] === 'function' ) {
				try {

					var params = self._config.authorize ? { agentId: request.agentId, params: request.payload.params } : request.payload.params;

					method.module[method.action]( params, function ( code, data ) {
						setImmediate( function () {
							if ( code === 200 ) {
								done( null, data );
							} else {

								if ( typeof data === 'string' ) {
									data = {
										message: data,
										data:    null
									};
								}

								done( {
									code:    code,
									message: data.message,
									data:    data.data
								} );

							}

						} );
					} );
				} catch ( e ) {
					done( {
						code:    500,
						message: ('Failed to execute method: ' + e.message),
						data:    e.stack
					} );
				}
			} else {
				done( {
					code:    404,
					message: 'Method action not found',
					data:    null
				} );
			}
		}
	};

	timer.start();
	async.series( tasks, function ( err, result ) {

		var duration = timer.stop();

		if ( !result || !result.executeRequest ) {
			result = {
				executeRequest: null
			};
		}

		request.response( createResponsePayload(
			request.payload.id,
			err,
			result.executeRequest
		) );
	} );

};

FlingReceiver.prototype._validateRequestSchema = function ( request, done ) {

	if ( !request || typeof request !== 'object' ) {
		done( {
			code:    500,
			message: 'Internal Error: transport failed to return a request object',
			data:    (typeof request)
		} );
		return;
	}

	if ( !request.payload || typeof request.payload !== 'object' ) {
		done( {
			code:    500,
			message: 'Internal Error: transport failed to return a request.payload object',
			data:    (typeof request)
		} );
		return;
	}

	if ( !request.payload.hasOwnProperty( 'jsonrpc' ) ) {
		done( {
			code:    400,
			message: 'Required Field: jsonrpc',
			data:    (typeof request)
		} );
		return;
	}

	if ( request.payload.jsonrpc !== '2.0' ) {
		done( {
			code: 400,
			message: 'Unsupported Protocol Version: JSON RPC ' + request.payload.jsonrpc,
			data: (typeof request)
		} );
		return;
	}

	if ( !request.payload.hasOwnProperty( 'id' ) ) {
		done( {
			code:    400,
			message: 'Required Field: id',
			data:    (typeof request)
		} );
		return;
	}

	if ( !request.payload.hasOwnProperty( 'method' ) ) {
		done( {
			code:    400,
			message: 'Required Field: method',
			data:    (typeof request)
		} );
		return;
	}

	if ( !request.payload.method || request.payload.method.length < 1 ) {
		done( {
			code:    400,
			message: 'Required Field: method can not be an empty string',
			data:    (typeof request)
		} );
		return;
	}

	if ( !request.payload.hasOwnProperty( 'params' ) ) {
		done( {
			code:    400,
			message: 'Required Field: params must be supplied',
			data:    (typeof request)
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

FlingReceiver.prototype._authorize = function ( payload, done ) {
	if ( this._config.authorize ) {
		try {
			this._config.authorize( payload.agentId, payload.method, function ( authorized ) {
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

function createResponsePayload( id, error, data ) {

	var payload = {
		jsonrpc: '2.0',
		id:      (id || 0)
	};

	if ( error ) {
		payload.error = error;
	} else {
		payload.result = data;
	}

	return payload;

}

module.exports = FlingReceiver;
