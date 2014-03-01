"use strict";

var express = require( 'express' );
var http = require( 'http' );
var request = require( 'request' );

var httpServer = null;
var server = express();

module.exports = {
	init:           function ( done ) {
		httpServer = http.createServer( server ).listen( 8080, done );
	},
	dinit:          function ( done ) {
		httpServer.close( done );
	},
	constructor:    require( '../lib/transport.receiver.express.js' ),
	config:         {
		express: server,
		url:     '/rpc'
	},
	requestEmitter: function ( payload, done ) {

		request( {
			url:    'http://localhost:8080/rpc',
			json:   payload,
			method: 'POST'
		}, function ( err, response, body ) {
			if ( err ) {
				done( null );
			} else {
				done( body );
			}
		} );

	}
};

