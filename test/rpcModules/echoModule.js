"use strict";

module.exports.action = function ( request, done ) {

  done( 200, {
    yourParams: request,
    newData:    {
      hi: 'there'
    }
  } );

};
