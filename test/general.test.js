"use strict";

var assert = require( 'assert' );
var fling = require( '../index' );
var FlingReceiver = require( '../lib/receiver' );

describe( 'Fling General', function() {

	describe( 'createReceiver', function() {

		// TODO: Pete, put some tests in here for the createReceiver method, that test different aspects of its functionality, like this test
		it( 'should should return a fling receiver', function() {

			var receiver = fling.createReceiver( {
				baseDir: __dirname + '/rpcModules'
			} );

			assert.ok( receiver instanceof FlingReceiver );

		} );

	} );

} );
