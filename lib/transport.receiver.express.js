"use strict";

var AbstractReceiverTransport = require( './transport.receiver.abstract' );
var express = require( 'express' );
var Request = require( './request' );
var Response = require( './response' );

var ExpressReceiverTransport = function ( config ) {
	AbstractReceiverTransport.apply( this, arguments );

	this._server = this._config.express;
	this._url = this._config.url;

};
require( 'util' ).inherits( ExpressReceiverTransport, AbstractReceiverTransport );

ExpressReceiverTransport.prototype.init = function ( done ) {

	var self = this;
	self._server.post( self._url, express.json(), function ( httpRequest, httpResponse ) {

		var request = new Request( httpRequest.body, httpRequest );
		var response = new Response( request.getId() );

		response.once( 'send', function ( payload ) {

			if ( typeof self._config.beforeSend === 'function' ) {
				payload = self._config.beforeSend( payload );
			}

			payload = JSON.stringify( payload );

			httpResponse.writeHead( 200, {
				'Content-Length': Buffer.byteLength( payload, 'utf8' ),
				'Content-Type':   'application/json'
			} );

			httpResponse.end( payload );

		} );

		self.emit( 'rpc', {
			request:  request,
			response: response
		} );

	} );

	setImmediate( done, null );

};

ExpressReceiverTransport.prototype.dinit = function ( done ) {

	var routes = this._server.routes;

	for ( var i = 0; i < routes.length; i++ ) {
		if ( routes[i].path === this._url ) {
			delete routes[i];
			break;
		}
	}

	setImmediate( done, null );

};

//function makeResponse( id, httpResponse ) {
//
//	var response = new Response( id );
//
//	response.once( 'send', function ( payload ) {
//
//		payload = JSON.stringify( payload );
//
//		httpResponse.writeHead( 200, {
//			'Content-Length': Buffer.byteLength( payload, 'utf8' ),
//			'Content-Type':   'application/json'
//		} );
//
//		httpResponse.end( payload );
//
//	} );
//
//	return response;
//
//}

//function generateCallback( httpResponse, notify ) {
//
//	var notified = false;
//	var _notify = function () {
//		if ( notified ) {
//			return;
//		}
//		notified = true;
//
//		if ( typeof notify === 'function' ) {
//			setImmediate( notify );
//		}
//	};
//
//	return function ( responseObject ) {
//
//		_notify();
//
//		var payload = JSON.stringify( responseObject );
//
//		// Note: HTTP status is always 200 even if the RPC status is not. This
//		// is because the transport layer status and RPC layer status codes have
//		// nothing to do with each other.
//		httpResponse.writeHead( 200, {
//			'Content-Length': Buffer.byteLength( payload, 'utf8' ),
//			'Content-Type':   'application/json' } );
//
//		httpResponse.end( payload );
//
//	};
//}

module.exports = ExpressReceiverTransport;
