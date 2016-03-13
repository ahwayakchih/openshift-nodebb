/*
 * This file is a wrapper around original app.js from NodeBB.
 * It sets up config overrides using values from OpenShift environment,
 * and then requires original app.js (now renamed to _app.js) to let
 * NodeBB continue it's magic.
 */
var nconf = require('nconf');
var url   = require('url');

var testSSL = require('./.openshift/tools/test-ssl.js');

var IP   = process.env.OPENSHIFT_NODEJS_IP   || null;
var PORT = process.env.OPENSHIFT_NODEJS_PORT || 8080;

// Fully Qualified Domain Name
var FQDN = process.env.OPENSHIFT_APP_DNS_ALIAS || process.env.OPENSHIFT_APP_DNS || false;

// Check is SSL is working on selected domain name
testSSL(IP, PORT, FQDN, function onTestSSLResult (err) {
	'use strict';

	// HTTPS or HTTP and WSS or WS
	var USE_SSL = err ? false : true;

	// Prepare config overrides
	var config = {};

	// Port number
	if (PORT) {
		config.port = PORT;
	}

	// Bind to IP address
	if (IP) {
		config.bind_address = IP;
	}

	// Default domain name
	if (FQDN) {
		config.url = (USE_SSL ? 'https' : 'http') + '://' + FQDN;

		// OpenShift supports websockets but only on ports 8000 and 8443
		config['socket.io'] = config['socket.io'] || {};

		if (USE_SSL) {
			config['socket.io'].address = 'wss://' + FQDN + ':8443';
		}
		else {
			config['socket.io'].address = 'ws://' + FQDN + ':8000';
		}
	}

	// MongoDB is preferred by default
	if (process.env.OPENSHIFT_MONGODB_DB_HOST || process.env.OPENSHIFT_MONGODB_IP || process.env.OPENSHIFT_MONGODB_DB_PASSWORD) {
		config.database = config.database || 'mongo';
		config.mongo = config.mongo || {};

		// OpenShift seems to create MongoDB datbase with the same name as the application name.
		config.mongo.database = process.env.OPENSHIFT_APP_NAME || 'nodebb';

		if (process.env.OPENSHIFT_MONGODB_DB_HOST || process.env.OPENSHIFT_MONGODB_IP) {
			config.mongo.host = process.env.OPENSHIFT_MONGODB_DB_HOST || process.env.OPENSHIFT_MONGODB_IP;
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

	// MongoLab is preferred by default
	if (process.env.MONGOLAB_URI) {
		config.database = config.database || 'mongo';
		config.mongo = config.mongo || {};
		
		var mongolabURL = url.parse(process.env.MONGOLAB_URI);
		mongolabURL.auth = mongolabURL.auth.split(':');
		
		config.mongo.host = mongolabURL.hostname;
		config.mongo.port = mongolabURL.port;
		config.mongo.username = mongolabURL.auth[0];
		config.mongo.password = mongolabURL.auth[1];
		config.mongo.database = mongolabURL.pathname.substring(1);
	}

	// Redis - by setting it up last, we make sure it will not override MongoDB as default database.
	// That allows us to have both databases, and will make NodeBB use redis for socket.io-session store.
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

	// Set overrides from OpenShift environment
	nconf.overrides(config);

	// Cleanup
	config = null;
	testSSL = null;
	IP = PORT = FQDN = null;

	// Continue booting NodeBB
	setImmediate(require.bind(null, './_app.js'));
});
