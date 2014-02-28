"use strict";

module.exports.action = function ( request, response ) {

	response.send( {
		module: 'nested',
		other:  [ 'data' ]
	} );

};
