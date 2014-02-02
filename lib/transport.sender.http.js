"use strict";

var AbstractSenderTransport = require( './transport.receiver.abstract' );

var ExpressReceiverTransport = function ( config ) {
  AbstractSenderTransport.apply( this, arguments );

  this._url = this._config.url;

};
require( 'util' ).inherits( ExpressReceiverTransport, AbstractSenderTransport );
