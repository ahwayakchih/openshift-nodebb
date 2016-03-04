var net   = require('net');
var fs    = require('fs');

// These are installed by NodeBB, so we do not need to install them
var async = require('async');
var nconf = require('nconf');

// Our stuff
var CommandServer = require('./onbb/CommandServer');

// NodeBB stuff
var emitter   = require(process.env.OPENSHIFT_REPO_DIR + '/src/emitter');
var webserver = require(process.env.OPENSHIFT_REPO_DIR + '/src/webserver');
var User      = require(process.env.OPENSHIFT_REPO_DIR + '/src/user');
var UserReset = require(process.env.OPENSHIFT_REPO_DIR + '/src/user/reset');

/**
 * Our custom commands.
 *
 * @type {CommandsMap}
 */
var COMMANDS = {};

/**
 * Generate reset code for user with given e-mail address.
 *
 * @type {CommandHandler}
 * @param {string} email
 */
COMMANDS.resetPassword = function resetPassword (done, email) {
	if (!email) {
		return setImmediate(done.bind(null, 'E-mail parameter is missing'));
	}

	async.waterfall([
		function(next) {
			User.getUidByEmail(email, next);
		},
		function(uid, next) {
			if (!uid) {
				return next(new Error('Mail not found'));
			}
			UserReset.generate(uid, next);
		},
		function(code, next) {
			next(null, nconf.get('url') + '/reset/' + code);
		}
	], done);
};

/**
 * Create and start CommandsServer.
 * Listen on `onbb-[NodeBB port number].sock` by default.
 *
 * Server will close automatically when process is killed.
 *
 * **WARNING:** this will work ONLY along with NodeBB application,
 *              so it must be called from the same process that
 *              started NodeBB's webserver.
 *
 * @param {string|Object} address
 * @param {Function}      [callback]
 * @return {CommandServer}
 */
function onbb_start_command_server (address, callback) {
	var server = new CommandServer({commands: COMMANDS});

	webserver.server.once('listening', function () {
		var nodebbAddress = webserver.server.address();

		if (!address) {
			address = 'onbb-' + (nodebbAddress.port || nodebbAddress) + '.sock';
		}

		server.start(address, callback);
	});


	process.on('SIGTERM', server.stop.bind(server));
	process.on('SIGINT', server.stop.bind(server));

	return server;
}

/*
 * Exports
 */
module.exports.onbb_start_command_server = onbb_start_command_server;