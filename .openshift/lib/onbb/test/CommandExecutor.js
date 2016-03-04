/*
 *	Run this test with mocha:
 *	http://visionmedia.github.io/mocha/
 */

var assert = require('assert');
var stream = require('stream');

var CommandExecutor = require('../CommandExecutor.js');

describe('CommandExecutor', function () {
	it('should construct an object of CommandExecutor class', function () {
		var executor = new CommandExecutor();
		assert.ok(executor);
		assert.ok(executor instanceof CommandExecutor, 'Wrong type returned: ' + typeof executor);
	});

	describe('help', function () {
		it('should output each command and its arguments', function (done) {
			// We will eval arrow functions on node versions that support them, and pass them as strings on other versions
			var e = parseInt(process.version, 10) > 4 ? eval : String;

			var test = [
				['fun0', function (done) {
					done();
				}, /fun0\n/],
				['funOne', function (done, first) {done()}, /funOne\s+first\n/],
				['funTwo', function (done, first, second) {done()}, /funTwo\s+first\s+second\n/],
				['funComm', function (done,/*something*/first, second/*=42*/) {done()}, /funComm\s+first\s+second\n/],
				// Use function source as strings to allow testing on versions without support for arrow functions
				['arr', e('() => done()'), /arr\n/],
				['arr0', e('done => done()'), /arr0\n/],
				['arr1', e('(done, first) => {\n'+
					+'	done();\n'+
					+'}'), /arr1\s+first\n/]
			];

			var executor = new CommandExecutor({commands: test.reduce(function (result, data) {
				result[data[0]] = data[1];
				return result;
			}, {})});

			executor.defaultHelpCommand(function (err, info) {
				assert.ifError(err);
				assert.ok(info, 'Help output is missing');

				test.forEach(function (data) {
					assert.ok(data[2].test(info), 'Invalid info for ' + data[0] + ':\n' + info);
				});

				done();
			});
		});
	});

	describe('transform', function () {
		var s;

		beforeEach(function () {
			s = new stream.Readable({objectMode: true});
			s._read = function () {};
		});

		afterEach(function () {
			s = null;
		});

		it('should error when command is unknown', function (done) {
			var executor = new CommandExecutor();

			var data = ['unknown'];
			var test = s.pipe(executor);
			test.on('data', function () {
				assert.ok(false, 'Data: No error was thrown');
			});
			test.on('end', function () {
				assert.ok(false, 'End: No error was thrown');
			});
			test.on('error', function (err) {
				assert.ok(err && err instanceof CommandExecutor.ERROR_UNKNOWN_COMMAND, 'Invalid error was thrown');
				done();
			});

			s.push(data);
			s.push(null);
		});

		it('should error when command is not a valid function', function (done) {
			var executor = new CommandExecutor({commands: {
				'invalid': 'string'
			}});

			var data = ['invalid'];
			var test = s.pipe(executor);
			test.on('data', function () {
				assert.ok(false, 'Data: No error was thrown');
			});
			test.on('end', function () {
				assert.ok(false, 'End: No error was thrown');
			});
			test.on('error', function (err) {
				assert.ok(err && err instanceof CommandExecutor.ERROR_INVALID_HANDLER, 'Invalid error was thrown');
				done();
			});

			s.push(data);
			s.push(null);
		});

		it('should NOT error when command errors', function (done) {
			var errorMsg = 'This is test error';

			var executor = new CommandExecutor({commands: {
				'error': function (done) {
					done(errorMsg);
				}
			}});

			var data = ['error'];
			var test = s.pipe(executor);
			test.on('data', function (data) {
				assert.ok(data.toString('utf8') === 'ERROR: ' + errorMsg + '\n', 'Invalid error was emitted in data');
			});
			test.on('end', function () {
				done();
			});
			test.on('error', function (err) {
				console.error(err);
				assert.ok(false, 'Error: No error should have been thrown');
			});

			s.push(data);
			s.push(null);
		});

		it('should output array when in object mode', function (done) {
			var testResults = ['one', 'two', 'three'];

			var executor = new CommandExecutor({
				commands: {
					'test': function (done) {
						var temp = testResults.slice();
						temp.unshift(null);
						done.apply(null, temp);
					}
				},
				objectMode: true
			});

			var data = ['test'];
			var test = s.pipe(executor);
			test.on('data', function (data) {
				assert.strictEqual(data.join(' '), testResults.join(' '));
			});
			test.on('end', function () {
				done();
			});
			test.on('error', function (err) {
				assert.ifError(err);
			});

			s.push(data);
			s.push(null);
		});

		it('should output string when not in object mode', function (done) {
			var testResults = ['one', 'two', 'three'];

			var executor = new CommandExecutor({
				commands: {
					'test': function (done) {
						var temp = testResults.slice();
						temp.unshift(null);
						done.apply(null, temp);
					}
				}
			});

			var data = ['test'];
			var test = s.pipe(executor);
			test.on('data', function (data) {
				assert.strictEqual(data.toString('utf8'), testResults.join(' ') + '\n');
			});
			test.on('end', function () {
				done();
			});
			test.on('error', function (err) {
				assert.ifError(err);
			});

			s.push(data);
			s.push(null);
		});
	});
});
