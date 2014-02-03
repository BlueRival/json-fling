"use strict";

module.exports.action = function ( request, done ) {
  done( 404, {
    message: 'you should see this in error.message',
    data:    {
      string: 'you should see this in error.message.data.string'
    }
  } );
};
