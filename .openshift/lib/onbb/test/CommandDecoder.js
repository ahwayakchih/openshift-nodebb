/*
 *	Run this test with mocha:
 *	http://visionmedia.github.io/mocha/
 */

var assert = require('assert');
var stream = require('stream');

var CommandDecoder = require('../CommandDecoder.js');

describe('CommandDecoder', function () {
	it('should construct an object of CommandDecoder class', function () {
		var decoder = new CommandDecoder();
		assert.ok(decoder);
		assert.ok(decoder instanceof CommandDecoder, 'Wrong type returned: ' + typeof decoder);
	});

	describe('transform', function () {
		var s;

		beforeEach(function () {
			s = new stream.Readable();
			s._read = function () {};
		});

		afterEach(function () {
			s = null;
		});

		it('should decode simple command, without line-feed char', function (done) {
			var decoder = new CommandDecoder();

			var data = 'test\n';
			var test = s.pipe(decoder);
			test.on('data', function (command) {
				assert.ok(command instanceof Array, 'Data was not instance of an array');
				assert.ok(command.length === 1, 'Data length should be 1, not ' + command.length);
			});
			test.on('end', function () {
				done();
			});
			test.on('error', function (err) {
				assert.ifError(err, 'No error should have been thrown');
			});

			s.push(data);
			s.push(null);
		});

		it('should decode simple command, with line-feed char', function (done) {
			var decoder = new CommandDecoder();

			var data = 'test\n';
			var test = s.pipe(decoder);
			test.on('data', function (command) {
				assert.ok(command instanceof Array, 'Data was not instance of an array');
				assert.ok(command.length === 1, 'Data length should be 1, not ' + command.length);
			});
			test.on('end', function () {
				done();
			});
			test.on('error', function (err) {
				assert.ifError(err, 'No error should have been thrown');
			});

			s.push(data);
			s.push(null);
		});

		it('should decode command with arguments', function (done) {
			var decoder = new CommandDecoder();

			var data = 'test one two three%20with%20spaces';
			var test = s.pipe(decoder);
			test.on('data', function (command) {
				assert.ok(command instanceof Array, 'Data was not instance of an array');
				assert.ok(command.length === 4, 'Data length should be 4, not ' + command.length);
				assert.strictEqual(command.map(encodeURI).join(' '), data);
			});
			test.on('end', function () {
				done();
			});
			test.on('error', function (err) {
				assert.ifError(err, 'No error should have been thrown');
			});

			s.push(data);
			s.push(null);
		});

		it('should decode multiple commands with arguments', function (done) {
			var decoder = new CommandDecoder();

			var data = [
				'0 first',
				'1 second with arguments',
				'2 third with white%20spaces%20in%20arguments'
			];
			var test = s.pipe(decoder);
			test.on('data', function (command) {
				assert.ok(command instanceof Array, 'Data was not instance of an array');

				var index = parseInt(command[0], 10);
				assert.strictEqual(command.map(encodeURI).join(' '), data[index]);
			});
			test.on('end', function () {
				done();
			});
			test.on('error', function (err) {
				assert.ifError(err, 'No error should have been thrown');
			});

			s.push(data.join('\n'));
			s.push(null);
		});
	});
});
