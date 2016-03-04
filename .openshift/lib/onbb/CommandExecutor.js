var util = require('util');
var stream = require('stream');
util.inherits(CommandExecutor, stream.Transform);

/**
 * Command result handler takes error or null as first argument.
 * Any other argument is handled as result data and is passed to stream output.
 *
 * @callback CommandDone
 * @param {Error} err=null   Handler should call it when it is done
 */

/**
 * Command handler function gets at least one argument: `done`.
 * Any additional arguments will be passed as second and later arguments.
 *
 * @callback CommandHandler
 * @param {!CommandDone} done   Handler should call it when it is done
 */

/**
 * Commands map is an object where each key as a command name
 * and each value is a CommandHandler function.
 *
 * @typedef CommandsMap
 */

/**
 * CommandExecutor takes stream of arrays and executes commands
 * based on data inside those arrays and outputs results as Arrays.
 *
 * @param {Object}      options                      @see `stream.Transform`
 * @param {CommandsMap} [options.commands]           Object of CommandHandler functions
 * @param {boolean}     [options.helpCommand=true]   Set to false to prevent adding default `help` command, if none is set in options.commands
 * @param {Object}      [options.objectMode=false]   When true, executor will output arrays, otherwise it will output text lines (one per command results)
 */
function CommandExecutor (options) {
	if (!(this instanceof CommandExecutor)) {
		return new CommandExecutor(options);
	}

	stream.Transform.call(this, options);
	this._writableState.objectMode = true;

	this._commands = options && options.commands ? options.commands : {};

	if (!this._commands.help && (!options || options.helpCommand !== false)) {
		this._commands.help = this.defaultHelpCommand.bind(this);
	}
}

/**
 * Error used when command is unknown.
 *
 * @const
 * @type {Error}
 */
CommandExecutor.ERROR_UNKNOWN_COMMAND = function ERROR_UNKNOWN_COMMAND (name) {
	this.name = this.constructor.name;
	this.message = '`' + name + '` was not defined';
	Error.captureStackTrace(this, this.constructor);
};
util.inherits(CommandExecutor.ERROR_UNKNOWN_COMMAND, Error);

/**
 * Error used when command is not a function.
 *
 * @const
 * @type {Error}
 */
CommandExecutor.ERROR_INVALID_HANDLER = function ERROR_INVALID_HANDLER (name) {
	this.name = this.constructor.name;
	this.message = '`' + name + '` is not a function';
	Error.captureStackTrace(this, this.constructor);
};
util.inherits(CommandExecutor.ERROR_INVALID_HANDLER, Error);

/**
 * Regex used to clear up function source before extracting argument names.
 *
 * @const
 */
CommandExecutor.REGEX_STRIP_FUNC_COMMENTS = /((\/\/.*$)|(\/\*[\s\S]*?\*\/))/mg;

/**
 * Regex used to clear up function source before extracting argument names.
 *
 * @const
 */
CommandExecutor.REGEX_STRIP_FUNC_BODY = /^(function\s+)?\(|\)\s*\{[\w\W]*$|\)?\s*=>[\w\W]*$/mg;


/**
 * Regex used to extract argument names from function source.
 *
 * @const
 */
CommandExecutor.REGEX_SPLIT_FUNC_ARGS = /\s*,\s*/;

/**
 * Find names of function arguments in function source string.
 * Based on http://stackoverflow.com/a/9924463
 */
CommandExecutor.prototype.findFunctionArgs = function findFunctionArgs (source) {
	if (source && source instanceof Function) {
		source = source.toString();
	}

	source = source.replace(CommandExecutor.REGEX_STRIP_FUNC_COMMENTS, '').replace(CommandExecutor.REGEX_STRIP_FUNC_BODY, '');

	return source.split(CommandExecutor.REGEX_SPLIT_FUNC_ARGS);
};

/**
 * Default "help" command lists all available commands.
 */
CommandExecutor.prototype.defaultHelpCommand = function defaultHelpCommand (done) {
	var names = Object.keys(this._commands);

	var maxNameLength = names.reduce(function (result, name) {
		return Math.max(result, name.length);
	}, 0);

	var result = 'Following commands are available:\n\n';

	result += names.reduce((function (result, name) {
		var pad = new Array(maxNameLength - name.length + 2).join(' ');
		var args = this.findFunctionArgs(this._commands[name]);

		// Ignore first callback
		args.shift();
		args = args.join(' ');

		result += '   ' + name + (args ? pad + args : '');

		return result + '\n';
	}).bind(this), '');

	done(null, result);
};

/**
 * Handle results from command.
 *
 * @param {!Function} done
 * @param {Error}     [error=null]
 */
CommandExecutor.prototype.commandResultHandler = function commandResultHandler (done, err) {
	var args = [];

	// Skip `done` and `err`
	for (var i = 2; i < arguments.length; i++) {
		args.push(arguments[i]);
	}

	if (err && !(err instanceof Error) && this._readableState.objectMode) {
		err = new Error(err);
	}

	if (!this._readableState.objectMode) {
		args = args.join(' ') + '\n';
		err = err ? 'ERROR: ' + (err.message || err) + '\n' : null;
	}

	// Errors returned from commands are "safe", so we return them instead of args
	done(null, err ? err : args);
};

/**
 * Implementation of `stream.Transform._transform`.
 *
 * @param {Buffer}   chunk
 * @param {string}   [encoding]
 * @param {Function} done
 */
CommandExecutor.prototype._transform = function CommandExecutor_transform (chunk, encoding, done) {
	var name = chunk.shift();

	if (!name || !this._commands[name]) {
		return done(new CommandExecutor.ERROR_UNKNOWN_COMMAND(name));
	}

	if (!(this._commands[name] instanceof Function)) {
		return done(new CommandExecutor.ERROR_INVALID_HANDLER(name));
	}

	chunk.unshift(this.commandResultHandler.bind(this, done));

	try {
		this._commands[name].apply(null, chunk);
	}
	catch (err) {
		done(err);
	}
};

/*
 * Exports
 */
module.exports = CommandExecutor;