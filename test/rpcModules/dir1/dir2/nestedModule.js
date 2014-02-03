"use strict";

module.exports.action = function ( request, done ) {
  done( 200, {
    module: 'nested',
    other:  [ 'data' ]
  } );
};
