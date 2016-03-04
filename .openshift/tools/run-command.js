#!/usr/bin/env node

/**
 * This script connects to command server, pipes command and waits for response.
 * It quits after a time no data from server.
 *
 * @param {string} socketPath
 * @param {string} [command]    If no command specified, script will wait for data on stdin
 */
var net = require('net');

var StringDecoder = require('string_decoder').StringDecoder;

// Get args passed from command line
var argv = process.argv.slice();

// Ignore interpreter
argv.shift();

// Ignore script name
argv.shift();

var socketPath = argv.shift();

var socket = net.createConnection(socketPath);
var buffer = '';
var timer  = null;

socket.on('connect', function () {
	socket.pipe(process.stdout);

	if (argv.length > 0) {
		socket.write(argv.map(encodeURI).join(' ') + '\n');
		return;
	}

	process.stdin.pipe(socket, {end: false});
});

socket.on('data', function (data) {
	if (timer) {
		clearTimeout(timer);
	}

	timer = setTimeout(this.end.bind(this), 500);
});

var cleanup = function (err) {
	if (timer) {
		clearTimeout(timer);
		timer = null;
	}

	socket = null;

	if (err) {
		console.error(err);
		process.exit(1);
	}
};

socket.on('error', cleanup);
socket.on('close', cleanup);

process.on('SIGTERM', cleanup);
process.on('SIGINT', cleanup);