"use strict";

var AbstractReceiverTransport = require( './transport.receiver.abstract' );
var express = require( 'express' );
var Request = require( './request' );
var Response = require( './response' );

var LocalReceiverTransport = function ( config ) {
	AbstractReceiverTransport.apply( this, arguments );
	this._source = this._config.source;
	this._beforeSend = this._config.beforeSend || null;
	this._initialized = false;
};
require( 'util' ).inherits( LocalReceiverTransport, AbstractReceiverTransport );

LocalReceiverTransport.prototype.init = function ( done ) {

	var self = this;
	if ( self._initialized ) {
		setImmediate( done, null );
		return;
	}
	self._initialized = true;

	// we store the handler so we can un-listen in dinit
	self._handler = function ( call ) {

		setImmediate( function () {
			var request = new Request( call.payload, call.context || null );
			var response = new Response( request.getId() );

			response.once( 'send', function ( payload ) {
				if ( typeof self._beforeSend === 'function' ) {
					payload = self._beforeSend( payload );
				}

				setImmediate( function () {
					call.done( payload );
				} );

			} );

			self.emit( 'rpc', {
				request:  request,
				response: response
			} );

		} );
	};

	self._source.on( 'rpc', self._handler );

	setImmediate( done, null );

};

LocalReceiverTransport.prototype.dinit = function ( done ) {

	if ( !this._initialized ) {
		setImmediate( done, null );
		return;
	}
	this._initialized = false;

	this._source.removeListener( 'rpc', this._handler );

	setImmediate( done, null );

};

module.exports = LocalReceiverTransport;
