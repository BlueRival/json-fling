"use strict";

module.exports.action = function ( request, response ) {

	var output = request.getParams();
	output.injectedData = {
		you: ['should'],
		see: {
			this: 'data '
		}
	};

	response.send( output );

};

module.exports.action2 = function ( request, response ) {

	response.send( { action: 2 } );

};
