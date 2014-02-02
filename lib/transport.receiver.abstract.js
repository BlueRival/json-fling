"use strict";

var EventEmitter = require( 'events' ).EventEmitter;

var AbstractReceiverTransport = function ( config ) {
  EventEmitter.call( this );
  this._config = config;

  if ( this._config.hasOwnProperty( 'authenticate' ) && typeof this._config.authenticate !== 'function' ) {
    throw new Error( 'config field authenticate must be a function if supplied' );
  }

};
require( 'util' ).inherits( AbstractReceiverTransport, EventEmitter );

AbstractReceiverTransport.prototype.init = function ( done ) {
  setImmediate( done, 400, 'NOT IMPLEMENTED' );
};

AbstractReceiverTransport.prototype.dinit = function ( done ) {
  setImmediate( done, 400, 'NOT IMPLEMENTED' );
};

AbstractReceiverTransport.prototype._authenticate = function ( payload, done ) {

  if ( this._config._authenticate ) {

    try {

      this._config._authenticate( payload, function ( id ) {
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
