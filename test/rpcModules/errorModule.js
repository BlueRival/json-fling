"use strict";

module.exports.action = function ( request, response ) {

	response.hasError();
	response.addError( 404, 'you should see this in error.message', { string: 'you should see this in error.message.data.string' } );
	response.send();

};

module.exports.actionMultiple = function ( request, response ) {

	response.addError( 404, 'you should see this in error.data[0].message', { string: 'you should see this in error.data[0].message.data.string' } );
	response.addError( { code: 404, message: 'you should see this in error.data[1].message', data: { string: 'you should see this in error.data[1].message.data.string' } } );

	response.send();

};

module.exports.actionSendPayload = function ( request, response ) {

	response.addError( { code: 404, message: 'you should see this in error.data[0].message', data: { string: 'you should see this in error.data[0].message.data.string' } } );
	response.addError( 404, 'you should see this in error.data[1].message', { string: 'you should see this in error.data[1].message.data.string' } );

	response.send( { hello: 'world' } );

};
