"use strict";

module.exports.Receiver = require( './lib/receive' );
module.exports.Sender = require( './lib/send' );

module.exports.transports = {
  receivers: {
    Express: require( './lib/transport.receiver.express' )
  },
  senders:   {
    Http: require( './lib/transport.sender.http' )
  }
};
