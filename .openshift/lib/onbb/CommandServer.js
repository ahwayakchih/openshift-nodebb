var util = require('util');
var net = require('net');
var fs = require('fs');
util.inherits(CommandServer, net.Server);

var CommandDecoder = require('./CommandDecoder');
var CommandExecutor = require('./CommandExecutor');

/**
 * CommandServer listens for commands executes them and outputs results.
 *
 * @param {Object}      options              @see `net.createServer`
 * @param {CommandsMap} [options.commands]   @see `CommandExecutor`
 */
function CommandServer (options) {
	if (!(this instanceof CommandServer)) {
		return new CommandServer(options);
	}

	net.Server.call(this, options, this.onConnection.bind(this));

	this._csAddress = null;
	this._csCommands = options && options.commands ? options.commands : {};
	this._csCommanders = [];
}

/**
 * Handle connection
 *
 * @param {net.Socket} socket
 */
CommandServer.prototype.onConnection = function onConnection (socket) {
	this._csCommanders.push(socket);

	function _onSocketError (err) {
		if (socket) {
			socket.end('ERROR: ' + err.message + '\n');
		}

		this.end();
	};

	function _onSocketClose (hadError) {
		var index = this._csCommanders.indexOf(socket);
		if (index >= 0) {
			this._csCommanders.splice(index, 1);
		}

		socket = null;
	};

	socket
		.on('error', _onSocketError)
		.on('close', _onSocketClose.bind(this))
		.pipe(new CommandDecoder())
		.on('error', _onSocketError)
		.pipe(new CommandExecutor({commands: this._csCommands}))
		.on('error', _onSocketError)
		.pipe(socket)
		.on('error', _onSocketError)
	;
};

/**
 * Based on code from nodebb/src/webserver.js
 *
 * @param {string}    socketPath
 * @param {!Function} callback
 */
CommandServer.prototype.testSocket = function testSocket (socketPath, callback) {
	if (typeof socketPath !== 'string') {
		return setImmediate(callback);
	}

	if (!callback || !(callback instanceof Function)) {
		return;
	}

	function _onTestSocketError (err) {
		setImmediate(this.end.bind(this));

		if (err.code !== 'ECONNREFUSED') {
			return callback(err);
		}

		fs.unlink(socketPath, callback);
	};

	function _onTestSocketSuccess () {
		setImmediate(this.end.bind(this));
		callback(new Error('port-in-use'));
	};

	function _onSocketFileExists (_onTestSocketSuccess, _onTestSocketError, exists) {
		if (!exists) {
			return setImmediate(callback);
		}

		var testSocket = new net.Socket();
		testSocket.on('error', _onTestSocketError.bind(testSocket));
		testSocket.connect({path: socketPath}, _onTestSocketSuccess.bind(testSocket));
	};

	fs.exists(socketPath, _onSocketFileExists.bind(null, _onTestSocketSuccess, _onTestSocketError));
};

/**
 * Start server.
 *
 * @param {string|Object}   address      Unix Domain Socket path or object with `port` number and optional `hostname`
 * @param {Function}        [callback]   Called after server starts listening
 */
CommandServer.prototype.start = function start (address, callback) {
	if (this._csAddress) {
		return callback ? setImmediate(callback) : null;
	}

	var hasCallback = callback && callback instanceof Function;

	this.testSocket(address, (function (err) {
		if (err) {
			if (hasCallback) {
				callback(err);
			}

			return;
		}

		this.once('listening', function () {
			this._csAddress = this.address();
			if (hasCallback) {
				this.removeListener('error', callback);
			}
		});

		if (hasCallback) {
			this.once('error', callback);
			this.once('listening', callback);
		}

		if (address.port) {
			return this.listen(address.port, address.hostname || null);
		}

		this.listen(address);
	}).bind(this));
};

/**
 * Stop server
 *
 * @param {Function} [callback]   Called after server stops listening
 */
CommandServer.prototype.stop = function stop (callback) {
	if (!this._csAddress) {
		return callback ? setImmediate(callback) : null;
	}

	this._csCommanders.map(function (socket) {
		socket.destroy();
	});

	this._csCommanders = [];
	this._csAddress = null;

	this.close(callback);
};

/*
 * Exports
 */
module.exports = CommandServer;