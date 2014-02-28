"use strict";

var EventEmitter = require( 'events' ).EventEmitter;

var Response = function ( id ) {
	EventEmitter.apply( this, arguments );

	this._id = id || 0;
	this._errors = [];

	this._sent = null;

};
require( 'util' ).inherits( Response, EventEmitter );

Response.prototype.isSent = function () {
	return this._sent !== null;
};

/**
 * Add Error
 *
 * Adds an error to the
 *
 * @param {number} [code=500] - The error code
 * @param {string} [message=null] - A string describing the error
 * @param {null|array|object|string|number} [data=null] - Any data context for the error
 *
 * @returns {Number} Total number of errors, including this one
 */
Response.prototype.addError = function ( code, message, data ) {

	var _code;
	var _message;
	var _data;

	for ( var i in arguments ) {
		if ( arguments.hasOwnProperty( i ) ) {

			switch ( typeof arguments[i] ) {

				case 'number':
					if ( typeof _code === 'undefined' && arguments[i] === Math.floor( arguments[i] ) ) {
						_code = Math.floor( arguments[i] ); // ensure its an integer
					}
					break;

				case 'string':
					if ( typeof _message === 'undefined' ) {
						_message = arguments[i];
					} else if ( typeof _data === 'undefined' ) {
						_data = arguments[i];
					}
					break;

				case 'object':
					if ( typeof _data === 'undefined' ) {
						_data = arguments[i];
					}
					break;

			}
		}
	}

	this._errors.push( {
		code:    ( _code || 500),
		message: (typeof _message === 'string' ? _message : ''),
		data:    (_data || null)
	} );

	return this._errors.length;

};

Response.prototype.getErrors = function () {
	return this._errors;
};

Response.prototype.isSuccess = function () {
	return !this.hasError();
};


Response.prototype.hasError = function () {
	return this._errors.length > 0;
};

Response.prototype.send = function ( payload ) {

	payload = payload || null;

	if ( this.isSent() ) {
		this.emit( 'warning', 'already sent' );
		return;
	}

	var output = {
		jsonrpc: '2.0',
		id:      this._id
	};

	if ( this.hasError() ) {

		var error = this.getErrors();
		if ( error.length === 1 ) {
			error = error[0];
		} else {
			error = {
				code:    400,
				message: 'multiple errors',
				data:    error
			};
		}

		output.error = error;
	} else {

		output.result = payload;
	}

	this._sent = output;

	this.emit( 'send', output );

};

module.exports = Response;
