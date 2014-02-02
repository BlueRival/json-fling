"use strict";

var lastDone = null;
var lastExpressCallback = null;
var express = {
  post: function ( url, jsonHandler, callback ) {
    lastExpressCallback = callback;
    express.routes = [
      { path: url }
    ];
  },
  json: function () {
    // NO-OP
  }
};

var req = {
  body: ''
};
var res = {
  writeHead: function ( code, headers ) {
    // NO-OP
  },
  end:       function ( payload ) {
    if ( lastDone ) {
      lastDone( JSON.parse( payload ) );
    }
  }
};

module.exports = {
  constructor:    require( '../lib/transport.receiver.express.js' ),
  config:         {
    express: express,
    url:     '/rpc'
  },
  requestEmitter: function ( payload, done ) {

    req.body = payload;
    lastDone = done;

    setImmediate( lastExpressCallback, req, res );

  }
};

