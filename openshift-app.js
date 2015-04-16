/*
 * This wile is a wrapper around original app.js from NodeBB.
 * It sets up config overrides using values from OpenShift environment,
 * and then requires original app.js (now called to _app.js) to let
 * NodeBB continue it's magic.
 */
var nconf = require('nconf');

// Set overrides from OpenShift environment
nconf.overrides((function(){
	'use strict';

	var config = {};

	if (process.env.OPENSHIFT_NODEJS_PORT) {
		config.port = process.env.OPENSHIFT_NODEJS_PORT;
	}

	if (process.env.OPENSHIFT_NODEJS_IP) {
		config.bind_address = process.env.OPENSHIFT_NODEJS_IP;
	}

	if (process.env.OPENSHIFT_APP_DNS) {
		config.url = 'https://' + process.env.OPENSHIFT_APP_DNS;

		// OpenShift supports websockets but only on ports 8000 and 8443
		config['socket.io'] = config['socket.io'] || {};
		config['socket.io'].address = 'wss://' + process.env.OPENSHIFT_APP_DNS + ':8443';
	}

	// Redis
	if (process.env.OPENSHIFT_REDIS_HOST || process.env.REDIS_PASSWORD) {
		config.database = config.database || 'redis';
		config.redis = config.redis || {};

		if (process.env.OPENSHIFT_REDIS_HOST) {
			config.redis.host = process.env.OPENSHIFT_REDIS_HOST;
		}
		if (process.env.OPENSHIFT_REDIS_PORT) {
			config.redis.port = process.env.OPENSHIFT_REDIS_PORT;
		}
		if (process.env.REDIS_PASSWORD) {
			config.redis.password = process.env.REDIS_PASSWORD;
		}
	}

	// MongoDB
	if (process.env.OPENSHIFT_MONGODB_DB_HOST || process.env.OPENSHIFT_MONGODB_DB_PASSWORD) {
		config.database = config.database || 'mongo';
		config.mongo = config.mongo || {};

		// OpenShift seems to create MongoDB datbase with the same name as the application name.
		config.mongo.database = process.env.OPENSHIFT_APP_NAME || 'nodebb';

		if (process.env.OPENSHIFT_MONGODB_DB_HOST) {
			config.mongo.host = process.env.OPENSHIFT_MONGODB_DB_HOST;
		}
		if (process.env.OPENSHIFT_MONGODB_DB_PORT) {
			config.mongo.port = process.env.OPENSHIFT_MONGODB_DB_PORT;
		}
		if (process.env.OPENSHIFT_MONGODB_DB_USERNAME) {
			config.mongo.username = process.env.OPENSHIFT_MONGODB_DB_USERNAME;
		}
		if (process.env.OPENSHIFT_MONGODB_DB_PASSWORD) {
			config.mongo.password = process.env.OPENSHIFT_MONGODB_DB_PASSWORD;
		}
	}

	return config;
})());

require('./_app.js');
