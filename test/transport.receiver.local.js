"use strict";

var source = new (require( 'events' ).EventEmitter)();

module.exports = {
	init:           function ( done ) {
		done( null );
	},
	dinit:          function ( done ) {
		done( null );
	},
	constructor:    require( '../lib/transport.receiver.local.js' ),
	config:         {
		source: source
	},
	requestEmitter: function ( payload, done ) {

		source.emit( 'rpc', {
			payload: payload,
			context: 'this is the context',
			done:    done
		} );

	}
};

