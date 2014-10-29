"use strict";

module.exports.Receiver = require( './lib/receiver' );

module.exports.transports = {
	receivers: {
		Express: require( './lib/transport.receiver.express' ),
		Local:   require( './lib/transport.receiver.local' )
	},
	senders:   {
		Http: require( './lib/transport.sender.http' )
	}
};

// convenience method for creating a receiver.
module.exports.createReceiver = function( params ) {

	params = params || {};
	var transConfig = params.transports;

	var receiver = new this.Receiver( {
		baseDir: params.baseDir
	} );

	for ( var name in transConfig ) {
		if ( transConfig.hasOwnProperty( name ) && this.transports.receivers.hasOwnProperty( name ) ) {
			receiver.addTransport( new this.transports.receivers[ name ]( transConfig[ name ] ) );
		}
	}

	return receiver;
};
