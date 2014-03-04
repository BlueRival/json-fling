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
 * @param {number} [err.code=500] - The error code
 * @param {string} [err.message=null] - A string describing the error
 * @param {null|array|object|string|number} [err.data=null] - Any data context for the error
 *
 * @returns {Number} Total number of errors, including this one
 */
Response.prototype.addError = function ( err ) {

	// clamp old style parameters to err object
	if ( typeof err === 'number' && typeof arguments[1] === 'string' ) {
		err = {
			code:    err,
			message: arguments[1]
		};
	}
	if ( arguments[2] ) {
		err.data = arguments[2];
	}

	this._errors.push( {
		code:    ( err.code || 500),
		message: (typeof err.message === 'string' ? err.message : ''),
		data:    (err.data || null)
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
