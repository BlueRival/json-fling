"use strict";

module.exports.receiver = require( './lib/receive' );
module.exports.receiver = require( './lib/send' );

module.exports.transports = {
  receivers: {
    express: require( './lib/transport.receiver.express' )
  },
  senders:   {
    http: require( './lib/transport.sender.http' )
  }
};
