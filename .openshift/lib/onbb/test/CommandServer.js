/*
 *	Run this test with mocha:
 *	http://visionmedia.github.io/mocha/
 */

var assert = require('assert');
var stream = require('stream');
var net    = require('net');
var fs     = require('fs');

var CommandServer = require('../CommandServer.js');

describe('CommandServer', function () {
	it('should construct an object of CommandServer class', function () {
		var server = new CommandServer();
		assert.ok(server);
		assert.ok(server instanceof CommandServer, 'Wrong type returned: ' + typeof server);
	});

	describe('start and stop', function () {
		var s;

		beforeEach(function () {
			s = new CommandServer();
		});

		afterEach(function (done) {
			s.stop(done);
			s = null;
		});

		it('should start and remove socket file after stop', function (done) {
			var sockPath = 'test.sock';

			s.start(sockPath, function (err) {
				assert.ifError(err);

				s.stop(function (err) {
					assert.ifError(err);
					fs.exists(sockPath, function (exists) {
						assert.strictEqual(exists, false);
						done();
					});
				});
			});
		});
	});

	describe('commands', function () {
		var s;
		var socketPath = 'test.sock';
		var commands = {};

		beforeEach(function (done) {
			s = new CommandServer({commands: commands});
			s.start(socketPath, done);
		});

		afterEach(function (done) {
			s.stop(done);
			s = null;
		});

		it('should start and remove socket file after stop', function (done) {
			var executed = false;
			var testParam = "But I don't want to go among mad people";
			var testResult = "We're all mad here";

			commands.test = function (callback, param) {
				executed = true;
				assert.strictEqual(param, testParam);
				setImmediate(callback.bind(null, null, testResult));
			};

			var socket = net.createConnection(socketPath);

			socket.on('connect', function () {
				socket.write('test ' + encodeURI(testParam) + '\n');
			});

			socket.on('data', function (data) {
				assert.strictEqual(data.toString('utf8'), testResult + '\n');
				this.end();
			});

			var cleanup = function () {
				delete commands.test;
				socket = null;

				assert.ok(executed, 'Command was not executed');
				done();
			};

			socket.on('error', cleanup);
			socket.on('close', cleanup);
		});
	});
});
