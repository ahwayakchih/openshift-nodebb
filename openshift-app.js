/*
 * This file is a wrapper around original app.js from NodeBB.
 * It sets up config overrides using values from OpenShift environment,
 * and then requires original app.js (now renamed to _app.js) to let
 * NodeBB continue it's magic.
 */
var nconf = require('nconf');
var url = require('url');

// Set overrides from OpenShift environment
nconf.overrides((function(){
	'use strict';

	var config = {};
	// Fully Qualified Domain Name
	var FQDN = process.env.OPENSHIFT_APP_DNS_ALIAS || process.env.OPENSHIFT_APP_DNS || false;
	// Separate FQDN for websockets (socket.io)
	var WSFQDN = FQDN;

	// Allow to override FQDN used for socket.io and enforce using OpenShift's domain
	// which might be helpful when using custom domain name without valid SSL certificate
	if (process.env.OPENSHIFT_NODEBB_WS_USE_APP_DNS) {
		WSFQDN = process.env.OPENSHIFT_APP_DNS || FQDN;
	}

	if (process.env.OPENSHIFT_NODEJS_PORT) {
		config.port = process.env.OPENSHIFT_NODEJS_PORT;
	}

	if (process.env.OPENSHIFT_NODEJS_IP) {
		config.bind_address = process.env.OPENSHIFT_NODEJS_IP;
	}

	if (FQDN) {
		config.url = 'https://' + FQDN;

		// OpenShift supports websockets but only on ports 8000 and 8443
		config['socket.io'] = config['socket.io'] || {};

		// Allow to enforce using insecure websockets as a workaround for custom domain without valid SSL certificate
		if (process.env.OPENSHIFT_NODEBB_WS_USE_INSECURE) {
			config['socket.io'].address = 'ws://' + WSFQDN + ':8000';
		}
		else {
			config['socket.io'].address = 'wss://' + WSFQDN + ':8443';
		}
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

	// MongoLab
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

	return config;
})());

require('./_app.js');
