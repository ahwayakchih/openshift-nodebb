#!/usr/bin/env node

/**
 * This script will read package.json data and ensure that it has `scripts.start` ans `scripts.stop`
 * set correctly. If it has to change anything, it will save updated package.json file.
 */
var fs = require('fs');

var packageFilePath = './package.json';
var package = JSON.parse(fs.readFileSync(packageFilePath));

var scriptStart = 'nodebb start';
var scriptStop  = 'nodebb stop';

var needsSave = false;

if (!package.scripts ||	package.scripts.start !== scriptStart || package.scripts.stop !== scriptStop) {
	needsSave = true;

	package.scripts.start = scriptStart;
	package.scripts.stop  = scriptStop;
}

if (needsSave) {
	fs.writeFileSync(packageFilePath, JSON.stringify(package, null, '  '));
}
