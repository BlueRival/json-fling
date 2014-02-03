json-fling
==========

JSON Fling is a simple JSON-RPC framework for NodeJS with built-in permissions and support for different transports.

Conforms to JSON RPC 2.0 Specification (http://www.jsonrpc.org/specification)

Example
===

Server

```
  // create express server the normal way
  var express = require( 'express' );
  var app = express();

  // setup fling instance before you start the web service
  var fling = require( 'fling' );
  var transport = new fling.transports.receivers.Express( {
    express: app,
    url: '/rpc'
  } );
  var receiver = new fling.Receiver( {
    baseDir: __dirname + '/lib/publicRpc' // this takes an absolute path
  } );

  receiver.addTransport( transport );

  // start the web service
  app.listen( 8080 );

```

Server RPC Module: /lib/publicRpc/a/path/to/a/node/module.js

```
  module.exports.action = function( request, done ) {
    done( 200, {
      some: 'response',
      for:  [ 'you' ]
    } );
  };

```


Client

```
  var request = require( 'request' );

  request( {
      url: 'http://somehost:8080/rpc',
      json: {
        jsonrpc: '2.0',
        id:      100,
        method:  'a.path.to.a.node.module.action',
        params:  {
          your: 'params',
          here: []
        }
      },
      method: 'POST'
    },
    function( err, response, body ) {

      console.log( body );

      // outputs
      // {
      //   jsonrpc: '2.0',
      //   id:      100,
      //   result:  {
      //     some: 'response',
      //     for:  [ 'you' ]
      //   }
      // }

  } );

```

Coming Soon
===

More receiver transports: TCP Socket, in-process, and more
Client transports to make an RPC call into a fling server
