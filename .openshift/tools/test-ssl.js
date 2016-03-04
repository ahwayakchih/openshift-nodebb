#!/usr/bin/env node

/**
 * This script will temporarily start webserver on HTTP and send request to it
 * through a specified domain using HTTPS to check if it works ok, e.g.,
 * if certificate is valid, if connection is routed correctly, etc...
 */
var https = require('https');
var http  = require('http');
var path  = require('path');

/**
 * Start server for a time of single request, check if it responds with correct data.
 * Depend on Node to check SSL certificate validity.
 *
 * @param {!string}   ip         IP number to listen on
 * @param {!number}   port       Port number to listen on
 * @param {!string}   hostname   Domain name to request through HTTPS
 * @param {!Function} callback   Will call with error or null as first argument
 */
function testSSL (ip, port, hostname, callback) {
	// OpenShift terminates SSL and passes request through regular HTTP.
	// So we need to setup HTTP server, and call it through HTTPS.
	var header = 'X-OpenShift-NodeBB-Test';
	var token = "" + Math.random();

	var server = http.createServer(function (req, res) {
		res.setHeader(header, token);
		res.writeHead(200, {'Content-Type': 'text/plain', 'Connection': 'close'});
		res.end('OK');
	});

	var cleanup = function cleanup (err) {
		if (!server) {
			return;
		}

		server.close(callback.bind(null, err));
		server = null;
		cleanup = null;
	};

	server.listen(port, ip || null, null, function onListening () {
		https.get('https://' + hostname, function (res) {
			res.on('data', function () {});
			cleanup(res.headers[header.toLowerCase()] !== token ? new Error('Wrong data returned') : null);
		}).on('error', cleanup);
	});
};

/*
 * Exports
 */
if (typeof module === 'object') {
	module.exports = testSSL;
}

// Exit if we're not called as a standalone application
if (require.main !== module) {
	return;
}

// Get args passed from command line
var argv = process.argv.slice();

/**
 * Domain name to be tested.
 *
 * @type {string}
 */
var testFQDN = argv.pop();

/**
 * Port number to be used for test
 *
 * @type {number}
 */
var testPORT = Math.min(Math.max(parseInt(argv.pop() || '', 10), 0), 65535);

// If one of args is not valid, show usage info and exit.
if (isNaN(testPORT) || !testFQDN) {
	var filename = path.basename(module.filename);
	console.log('USAGE: ' + filename + ' port hostname');
	console.log('EXAMPLE: ' + filename + ' ' + (process.env.OPENSHIFT_NODEJS_PORT || 8080) + ' ' + (process.env.OPENSHIFT_APP_DNS || 'example.com'));
	return process.exit(1);
}

// Run test
testSSL(process.env.OPENSHIFT_NODEJS_IP || null, testPORT, testFQDN, function (err) {
	if (err) {
		console.error(err);
	}

	process.exit(err ? 1 : 0);
});