"use strict";

module.exports.action = function ( request, response ) {

	response.send( {
		yourParams: request.getParams(),
		newData:    {
			hi: 'there'
		}
	} );

};
module.exports.action2 = function ( request, response ) {

	response.send( request.getParams() );

};
