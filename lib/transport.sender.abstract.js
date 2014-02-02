"use strict";

var EventEmitter = require( 'events' ).EventEmitter;

var AbstractSenderTransport = function ( config ) {
  EventEmitter.call( this );
  this._config = config;
};
require( 'util' ).inherits( AbstractSenderTransport, EventEmitter );

AbstractSenderTransport.prototype.init = function ( done ) {
  setImmediate( done, 400, 'NOT IMPLEMENTED' );
};

AbstractSenderTransport.prototype.dinit = function ( done ) {
  setImmediate( done, 400, 'NOT IMPLEMENTED' );
};
