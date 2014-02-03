"use strict";

module.exports.action = function ( request, done ) {

  request.injectedData = {
    you: ['should'],
    see: {
      this: 'data '
    }
  };

  done( 200, {
    module: 'root',
    other:  [ 'data' ]
  } );
};
