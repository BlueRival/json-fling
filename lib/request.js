"use strict";

var EventEmitter = require( 'events' ).EventEmitter;

var Request = function ( payload, context ) {
	EventEmitter.apply( this, arguments );

	this._agentSet = false;
	this._agent = null;
	this._payload = typeof payload === 'object' ? payload : {};
	this._context = (context || null);

};
require( 'util' ).inherits( Request, EventEmitter );

Request.prototype.getPayload = function () {
	return this._payload;
};

Request.prototype.hasAgent = function () {
	return this._agentSet;
};

Request.prototype.setAgent = function ( agent ) {
	this._agent = agent;
	this._agentSet = true;
	return this.getAgent();
};

Request.prototype.getAgent = function () {
	return this._agent;
};

Request.prototype.getContext = function () {
	return this._context;
};

Request.prototype.getId = function () {
	return this._payload.id;
};

Request.prototype.getMethod = function () {
	return this._payload.method;
};

Request.prototype.getParams = function () {
	return this._payload.params;
};

Request.prototype.getVersion = function () {
	return this._payload.jsonrpc;
};

module.exports = Request;
