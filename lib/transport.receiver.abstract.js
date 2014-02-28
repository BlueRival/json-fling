"use strict";

var EventEmitter = require( 'events' ).EventEmitter;

var AbstractReceiverTransport = function ( config ) {
	EventEmitter.call( this );

	this._config = config || {};

};
require( 'util' ).inherits( AbstractReceiverTransport, EventEmitter );

AbstractReceiverTransport.prototype.init = function ( done ) {
	setImmediate( done, null );
};

AbstractReceiverTransport.prototype.dinit = function ( done ) {
	setImmediate( done, null );
};

AbstractReceiverTransport.prototype.authenticate = function ( context, done ) {

	if ( typeof this._config.authenticate === 'function' ) {

		try {

			this._config.authenticate( context, function ( id ) {
				setImmediate( done, id );
			} );

		} catch ( e ) {

			setImmediate( done, null );

		}

	} else {

		setImmediate( done, null );

	}

};

module.exports = AbstractReceiverTransport;
