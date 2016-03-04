var util = require('util');
var stream = require('stream');
util.inherits(CommandDecoder, stream.Transform);

var StringDecoder = require('string_decoder').StringDecoder;

/**
 * CommandDecoder takes text stream input and outputs arrays.
 * It "decodes" stream by splitting it by '\n' lines,
 * splitting by whitespace, and decoding items using decodeURI.
 *
 * @param {Object} options   @see `stream.Transform`
 */
function CommandDecoder (options) {
	if (!(this instanceof CommandDecoder)) {
		return new CommandDecoder(options);
	}

	stream.Transform.call(this, options);
	this._writableState.objectMode = false;
	this._readableState.objectMode = true;

	this._buffer = '';
	this._decoder = new StringDecoder('utf8');
}

/**
 * Implementation of `stream.Transform._transform`.
 *
 * @param {Buffer}   chunk
 * @param {string}   [encoding]
 * @param {Function} done
 */
CommandDecoder.prototype._transform = function CommandDecoder_transform (chunk, encoding, done) {
	this._buffer += this._decoder.write(chunk);

	var lines = this._buffer.split(/\r?\n/);
	this._buffer = lines.pop();

	for (var l = 0; l < lines.length; l++) {
		this.push(lines[l].split(/\s+/).map(decodeURI));
	}

	done();
};

/**
 * Implementation of `stream.Transform._flush`.
 *
 * @param {Function} done
 */
CommandDecoder.prototype._flush = function CommandDecoder_flush (done) {
	this._decoder.end();

	// Last command line may have been without \n at the end, so decode it
	if (this._buffer.length > 0) {
		this.push(this._buffer.split(/\s+/).map(decodeURI));
	}

	this._buffer = '';

	done();
};

/*
 * Exports
 */
module.exports = CommandDecoder;