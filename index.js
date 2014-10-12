"use strict";

module.exports.Receiver = require( './lib/receive' );
module.exports.Sender = require( './lib/send' );

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

	var transConfig = params.transports;
	var transport;

	var receiver = new fling.Receiver({
		baseDir: params.baseDir
	});

	if ( transConfig.express ) {
		transport = new this.transports.receivers.Express( transConfig.express );
		transport.init( function() {
			receiver.addTransport( transport );
		});
	}

};
