#!/bin/bash

source $OPENSHIFT_CARTRIDGE_SDK_BASH

#
# Echo NodeBB version number from package.json file
#
function onbb_get_nodebb_version () {
	cat "${OPENSHIFT_REPO_DIR}package.json" | grep version | sed -s 's/[^0-9\.]//g'
}

#
# Echo URL found in config.json
#
function onbb_get_url_from_config () {
	cat "${OPENSHIFT_REPO_DIR}config.json" | sed -nr '/.*"url":\s*"(.*)".*/{s%.*:\s*"(https?://[^\/]+)/?".*%\1%p;}'
}

#
# Print information about failed NodeBB setup.
#
# @param {string} [logfile=log/openshift-nodebb-setup.log]   Path to NodeBB logfile
# @param {string} [reason]                                   Possible reason as a short one-liner, defaults to "unknown"
#
function onbb_echo_result_of_setup_failed () {
	local logfile=$1
	local reason=$2
	local message="Setup failed."

	if [ "$logfile" = "" ] ; then
		logfile="logs/openshift-nodebb-setup.log"
	fi

	if [ "$reason" = "" ] ; then
		message="Setup possibly failed - unknown result."
		reason="There was a problem completing NodeBB setup."
	fi

	client_result ""
	client_result ".-============================================-."
	client_result ".  Setup failed."
	client_result "."
	client_result ".  $reason"
	client_result "."
	client_result ".  Check logfile for more information:"
	client_result ".  $logfile"
	client_result "^-============================================-^"
	client_result ""
}

#
# Print information about successfull NodeBB setup.
#
# @param {string} [name]       Only if new admin account was created
# @param {string} [password]   Only if new admin account was created
# @param {string} [email]      Only if new admin account was created
#
function onbb_echo_result_of_setup_success () {
	local name=$1
	local pass=$2
	local email=$3

	if [ "$name" = "" -o "$pass" = "" -o "$email" = "" ] ; then
		client_result ""
		client_result ".-============================================-."
		client_result ".  Setup finished."
		client_result "."
		client_result ".  Please wait for NodeBB to start."
		client_result "^-============================================-^"
		client_result ""
	else
		client_result ""
		client_result ".-============================================-."
		client_result ".  Setup finished."
		client_result "."
		client_result ".  New administrator user has been created:"
		client_result "."
		client_result ".    email   : $email"
		client_result ".    login   : $name"
		client_result ".    password: $pass"
		client_result "."
		client_result ".  Please wait for NodeBB to start."
		client_result "."
		client_result ".  WARNING: Be sure to change admin password"
		client_result ".           after first log in!"
		client_result "^-============================================-^"
		client_result ""
	fi
}

#
# Print information about failed start of NodeBB.
#
# @param {string} [logfile=log/output.log]   Path to NodeBB logfile
#
function onbb_echo_result_of_start_failed () {
	local logfile=$1

	if [ "$logfile" = "" ] ; then
		logfile="logs/output.log"
	fi

	client_result ""
	client_result ".-============================================-."
	client_result ".  NodeBB failed to start for some reason."
	client_result "."
	client_result ".  Check logfile for more information:"
	client_result ".  logs/output.log"
	client_result "^-============================================-^"
	client_result ""
}

#
# Print information about NodeBB started and ready.
#
# @param {string} [url]   URL of NodeBB instance, defaults to the one found in config.json
#
function onbb_echo_result_of_start_success () {
	local url=$1

	if [ "$url" = "" ] ; then
		url=$(onbb_get_url_from_config)
	fi

	client_result ""
	client_result ".-============================================-."
	client_result ".  NodeBB is ready."
	client_result "."
	client_result ".  You can visit it at:"
	client_result ".  $url"
	client_result "."
	client_result ".  You can log in to it at:"
	client_result ".  $url/login"
	client_result "^-============================================-^"
	client_result ""
}

#
# Setup NODEBB_FQDN, preferring OPENSHIFT_APP_DNS_ALIAS, then OPENSHIFT_APP_DNS, or fail.
#
function onbb_setup_fqdn () {
	local FQDN="$OPENSHIFT_APP_DNS_ALIAS"

	if [ "$FQDN" = "" ] ; then
		FQDN="$OPENSHIFT_APP_DNS"
	fi

	if [ "$FQDN" = "" ] ; then
		return 1
	fi

	export NODEBB_FQDN="$FODN"
}

#
# Setup NODEBB_ADMIN_EMAIL from NODEBB_ADMIN_EMAIL, or from OPENSHIFT_LOGIN, or as OPENSHIFT_APP_NAME@NODEBB_FQDN, or fail.
#
function onbb_setup_email () {
	local email="$NODEBB_ADMIN_EMAIL"

	if [ "$email" = "" ] ; then
		email="$OPENSHIFT_LOGIN"
	fi

	if [ "$email" = "" -a "$NODEBB_FQDN" != "" ] ; then
		email="$OPENSHIFT_APP_NAME@$NODEBB_FQDN"
	fi

	if [ "$email" = "" ] ; then
		return 1
	fi

	export NODEBB_ADMIN_EMAIL="$email"
}

#
# Find and apply all patches matching NodeBB version number.
#
# @param [version] defaults to $(onbb_get_nodebb_version)
#
function onbb_setup_sourcecode () {
	local version=$1

	local d=`pwd`
	cd "$OPENSHIFT_REPO_DIR"

	if [ "$version" = "" ] ; then
		version=$(onbb_get_nodebb_version)
	fi

	local patches=`ls patches/openshift-$version*.diff 2>/dev/null`
	if [ "$patches" != "" ] ; then
		# Apply patches for selected version
		for changeset in $patches ; do
			echo "Applying changeset "$changeset
			local rejected=$changeset".rejected"
			patch -N --no-backup-if-mismatch -s -r $rejected -p1 < $changeset
			if [ -f "$rejected" ] ; then
				echo "Changeset $changeset was rejected. Check $rejected to see what parts of it could not be applied"
			fi
		done
	fi

	cd "$d"
}

#
# Setup directories and ensure everything is set up ok
#
function onbb_setup_environment () {
	local d=`pwd`
	cd "$OPENSHIFT_REPO_DIR"

	# Make sure, that `npm start` will run `nodebb start`, so nodejs cartridge can start it correctly
	.openshift/tools/ensure-package-scripts.js || return 1

	# Make sure NODEBB_FQDN is set
	onbb_setup_fqdn || return 1

	# Make sure NODEBB_ADMIN_EMAIL is set
	onbb_setup_email || return 1

	# Make sure, that our `onbb` module is installed and has all dependencies met
	cd .openshift/lib/onbb || return 1
	npm prune --production
	npm install --production || return 1
	cd ../../../

	# Make sure, that node.env, if it exists, will know to run nodebb
	# This is needed only for legacy support and only on OpenShift's default nodejs-0.10 cartridge
	local envFile="${OPENSHIFT_NODEJS_DIR}configuration/node.env"
	if [ -f $envFile ] ; then
		echo "Patching $envFile"
		sed -i 's/server.js/nodebb/g' "$envFile"
		sed -i 's/app.js/nodebb/g' "$envFile"
	fi

	# Override app.js
	# We have to move original and replace it with our "wrapper"
	# because NodeBB calls hardcoded "app.js" in some cases
	# and we do not want to modify code in too many places.
	if [ -f "openshift-app.js" ] ; then
		echo "Overriding app.js"
		mv app.js _app.js
		mv openshift-app.js app.js
	fi

	local NODEBB_DATA_DIR="${OPENSHIFT_DATA_DIR}nodebb"

	# Make sure there is persistent data directory
	mkdir -p "$NODEBB_DATA_DIR"

	# Symlink public/uploads to $OPENSHIFT_DATA_DIR/nodebb/public-uploads
	local uploadsDir="$NODEBB_DATA_DIR/public-uploads"
	if [ `readlink -f $uploadsDir` != `readlink -f public/uploads` ] ; then
		echo "Pointing uploads directory to $uploadsDir"
		cp -a public/uploads "$uploadsDir"
		rm -rf public/uploads
		ln -s "$uploadsDir" public/uploads
	fi

	# Symlink logs to $OPENSHIFT_DATA_DIR/nodebb/logs
	local logsDir="$NODEBB_DATA_DIR/logs"
	if [ `readlink -f $logsDir` != `readlink -f logs` ] ; then
		echo "Pointing logs directory to $logsDir"
		cp -a logs "$logsDir"
		rm -rf logs
		ln -s "$logsDir" logs
	fi

	# Symlink config.json to $OPENSHIFT_DATA_DIR/nodebb/config.json
	local configFilePath="$NODEBB_DATA_DIR/config.json"
	if [ `readlink -f $configFilePath` != `readlink -f config.json` ] ; then
		echo "Pointing config.json to $configFilePath"
		if [ -f config.json ] ; then
			cp -a config.json "$configFilePath"
		fi
		if [ ! -f "$configFilePath" ] ; then
			# Create valid, "empty" config, so we can create symlink
			echo -n "{}" > "$configFilePath"
		fi
		rm -rf config.json
		ln -s "$configFilePath" config.json
	fi

	cd "$d"
}

#
# Ensure that NodeBB is stopped. Wait until it is or time runs up
#
# @param {number} [timeout=2]      In seconds
# @param {number} [graceful=yes]   "no" to just kill node processes
#
function onbb_wait_until_stopped () {
	local seconds=$1
	local graceful=$2

	if [ "$seconds" = "" ] ; then
		seconds=2
	fi

	if [ "$graceful" = "" ] ; then
		graceful="yes"
	fi

	# Find first PID of node process of current user
	local PID=`pgrep -u $OPENSHIFT_APP_UUID -x node -o`

	# Return early if it stopped already
	if [ "$PID" = "" ] ; then
		return 0
	fi

	# Return error if there is no time left
	if [ "$seconds" -le "0" ] ; then
		return 1
	fi 

	# Stop it gracefully if we have more than a second of time left
	if [ "$seconds" -gt "1" -a "$graceful" = "yes" ] ; then
		local d=`pwd`
		cd "$OPENSHIFT_REPO_DIR"
		npm stop 2>/dev/null
		cd "$d"

		sleep 1

		onbb_wait_until_stopped $(echo "$seconds - 1" | bc) "no" || return 1
		return 0
	fi

	# KILL!
	kill "$PID" || return 1
	onbb_wait_until_stopped $(echo "$seconds - 1" | bc) "no" || return 1

	return 0
}

#
# Watch NodeBB log until it says it is listening for connections.
#
# @param {number} [timeout=120]   In seconds
#
function onbb_wait_until_ready () {
	local seconds=$1

	if [ "$seconds" = "" ] ; then
		# 2 minutes
		seconds=120
	fi

	local milliseconds=$(echo "$seconds * 1000" | bc)

	"${OPENSHIFT_REPO_DIR}.openshift/tools/wait-for-nodebb-to-start.js" $milliseconds || return 1
}

#
# Execute command on NodeBB server.
#
function onbb_exec_command () {
	local server=`ls "${OPENSHIFT_REPO_DIR}" | grep -m 1 'onbb-[0-9]*.sock'`

	if [ $server = "" ] ; then
		>&2 echo "No server found"
		return 1
	fi

	echo $@ | "${OPENSHIFT_REPO_DIR}.openshift/tools/run-command.js" "${OPENSHIFT_REPO_DIR}${server}" || return 1
}