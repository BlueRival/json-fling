"use strict";

var AbstractReceiverTransport = require( './transport.receiver.abstract' );
var express = require( 'express' );
var bodyParser = require( 'body-parser' );
var Request = require( './request' );
var Response = require( './response' );

var ExpressReceiverTransport = function( config ) {

	AbstractReceiverTransport.apply( this, arguments );

	this._server = this._config.app;
	this._url = this._config.url;

};
require( 'util' ).inherits( ExpressReceiverTransport, AbstractReceiverTransport );

ExpressReceiverTransport.prototype.init = function( done ) {

	var self = this;
	var router = express.Router();

	router.post( '/', bodyParser.json(), function( httpRequest, httpResponse ) {

		var request = new Request( httpRequest.body, httpRequest );
		var response = new Response( request.getId() );

		response.once( 'send', function( payload ) {

			if ( typeof self._config.beforeSend === 'function' ) {
				payload = self._config.beforeSend( payload );
			}

			httpResponse.writeHead( 200, {
				'Content-Type': 'application/json'
			} );

			httpResponse.end( JSON.stringify( payload ) );

		} );

		self.emit( 'rpc', {
			request: request,
			response: response
		} );

	} );

	self._server.use( self._url, router );

	setImmediate( done, null );

};

module.exports = ExpressReceiverTransport;
