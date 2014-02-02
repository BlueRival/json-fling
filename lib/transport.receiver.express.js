"use strict";

var AbstractReceiverTransport = require( './transport.receiver.abstract' );

var ExpressReceiverTransport = function ( config ) {
  AbstractReceiverTransport.apply( this, arguments );

  this._express = this._config.express;
  this._url = this._config.url;

};
require( 'util' ).inherits( ExpressReceiverTransport, AbstractReceiverTransport );

ExpressReceiverTransport.prototype.init = function ( done ) {

  var self = this;
  self._express.post( self._url, self._express.json(), function ( request, response ) {

    self._authenticate( {
        headers: request.headers,
        body:    request.body
      },
      function ( id ) {
        self.emit( 'request', {
          agentId:  id,
          payload:  request.body,
          response: generateCallback( response )
        } );
      } );

  } );

  setImmediate( done, null );

};

ExpressReceiverTransport.prototype.dinit = function ( done ) {

  var routes = this._express.routes;

  for ( var i = 0; i < routes.length; i++ ) {
    if ( routes[i].path === this._url ) {
      delete routes[i];
      break;
    }
  }

  setImmediate( done, null );

};

function generateCallback( httpResponse, notify ) {

  var notified = false;
  var _notify = function () {
    if ( notified ) {
      return;
    }
    notified = true;

    setImmediate( notify );
  };

  return function ( responseObject ) {

    _notify();

    var payload = JSON.stringify( responseObject );

    // Note: HTTP status is always 200 even if the RPC status is not. This
    // is because the transport layer status and RPC layer status codes have
    // nothing to do with each other.
    httpResponse.writeHead( 200, {
      'Content-Length': payload.length,
      'Content-Type':   'application/json' } );

    httpResponse.end( payload );

  };
}

module.exports = ExpressReceiverTransport;
