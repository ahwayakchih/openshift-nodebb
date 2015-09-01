NodeBB in the OpenShift cloud
=============================

This document will guide you through the process of installing NodeBB (http://www.nodebb.org) in OpenShift cloud (https://www.openshift.com/). It will also let you know how to keep NodeBB updated afterwards.

Before continuing, you should know how to open and use command line on your system. This guide does not describe how to do that.


## Prerequisites

First of all, you need an OpenShift account. If you do not have one yet, now is the time to register at https://www.openshift.com/app/account/new.

Next, install `rhc` application, as described at https://developers.openshift.com/en/managing-client-tools.html.

After that, you should have working `rhc` and `git` available on your system.


## Installation

To install NodeBB, follow these steps (they were tested using `bash` shell), without omitting any of them, on your local system (NOT on OpenShift side, through SSH).

### 1. Creating a new application

```sh
rhc app create nodebb nodejs-0.10
```

That should create your local copy of your OpenShift repository in a directory called "nodebb". If it does not, check if there were some errors in the output and maybe try again before continuing. Without that directory, rest of the steps will not work as they should.

### 2. Adding database cartridge

NodeBB supports both Redis and MongoDB databases. It's up to you to decide which one to use.

To use Redis, run:

```sh
rhc add-cartridge http://cartreflect-claytondev.rhcloud.com/reflect?github=transformatordesign/openshift-redis-cart -a nodebb
```

To use MongoDB, run:

```sh
rhc cartridge add mongodb-2.4 -a nodebb
```

Only one of them is needed, there is no point in adding both databases.

### 3. Add NodeBB repository

This will change current working directory to the one used for NodeBB.

```sh
cd nodebb
```

This will attach remote NodeBB repository to your local repository.

```sh
git remote add upstream -m master https://github.com/NodeBB/NodeBB.git
```

### 4. Import NodeBB code to application

This will import source code of NodeBB v0.7.x. To import different version instead, go to https://github.com/NodeBB/NodeBB, see what version branches are available and replace "v0.7.x" with selected version number.

```sh
git pull --no-edit -s recursive -X theirs upstream v0.7.x
```

This guide was tested with `v0.6.x` and `v0.7.x`.

### 5. Add OpenShift-NodeBB repository

This will allow to import patches and action_hooks needed to use NodeBB on OpenShift without worrying too much about dynamic IP changes.

```sh
git remote add openshift -m master https://github.com/ahwayakchih/openshift-nodebb.git
```

### 6. Import OpenShift-NodeBB patches

```sh
git pull --no-edit -s recursive -X theirs openshift master
```

### 7. Push everything to application repository

This will push source code to OpenShift servers, deploy and start application.

```sh
git push origin master
```

### 8. That's it!

After a while, you should be able to see something like this at the end of a long text output from previous command:

```
	.-============================================-.
	.  Setup Finished.
	.
	.  New administrator user has been created:
	.
	.    email   : nodebb@nodebb-youropenshiftusername.rhcloud.com
	.    login   : nodebb
	.    password: 9D7u-KAtN-76Kz-TCyX
	.
	.  You can login at:
	.  https://nodebb-youropenshiftusername.rhcloud.com/login
	.
	.  WARNING: Be sure to change admin e-mail and
	.           password as soon as possible!
	^-============================================-^
```

Use that new admin login and password to login into your new NodeBB installation, and change them to something suitable for you.


## Updates

From now on, every time you want to update NodeBB, you can simply follow three steps.

### 1. Pull changes

Update NodeBB source code:

```sh
git pull --no-edit -s recursive -X theirs upstream v0.7.x
```

If you want to jump to new version, just replace "v0.7.x" with different branch name. Just remember, that it will work only for uprade (it is possible to downgrade, just not with that single pull command).

Update OpenShift-NodeBB patches:

```sh
git pull --no-edit -s recursive -X theirs openshift master
```

### 2. Push changes

```sh
git push origin master
```

### 3. That's it!

After a while (sometimes quite a long while), you should be able to see something like this at the end of a long text output from previous command:

```
	.-============================================-.
	.  Setup Finished.
	.
	.  You can view your NodeBB at:
	.  https://nodebb-youropenshiftusername.rhcloud.com/
	^-============================================-^
```


## Plugins

If you just want to test things and look around, you can simply install/enable plugins through administration pages.

If you want to keep NodeBB running on OpenShift, you should add plugins through your repository instead. That is because OpenShift may erase all the files on server whenever you push changes to your repository.
NodeBB can install plugins, but it will not add them to the "package.json" file, nor it will commit changes to your repository.

To keep plugins installed and working between updates, you can install them using `npm`. Follow these steps on your local system (NOT on OpenShift side, through SSH).

### 1. Install plugin locally

This will change current working directory to the one used for NodeBB. 

```sh
cd nodebb
```

This will install "Question and Answer" NodeBB plugin (https://github.com/psychobunny/nodebb-plugin-question-and-answer) locally and save information about it to the "package.json" file.
You can change name of the module ("nodebb-plugin-question-and-answer" in this case), to install different plugin. Just remember to keep the "npm install --save" part of the command intact.

```sh
npm install --save nodebb-plugin-question-and-answer
```

### 2. Commit changes

This will commit modifications to local repository.

```sh
git commit -a -m 'Added QA plugin'
```

### 3. Push changes

```
git push origin master
```

## Custom domain name

If you want to use your own domain name, instead of subdomain in domain provided by OpenShift, you can add alias to your application:

```sh
rhc alias add nodebb example.com
```

Of course, instead of `example.com` enter your own domain name. You can read more about that at https://developers.openshift.com/en/managing-domains-ssl.html.

### 1. Add domain name to NodeBB

This will make openshift-nodebb installation work correctly with your custom domain name.

```sh
rhc set-env OPENSHIFT_APP_DNS_ALIAS=example.com -a nodebb
```

Again, use your own domain name in place of `example.com`.

### 2. Optional no-SSL-certificate workaround

If you do not have certificate signed by widely accepted certificate authority, you can either make NodeBB connect websockets to your OpenShift subdomain (which provides valid, accepted SSL certificate), or disable secure websockets.

This will make configuration to use OpenShift's subdomain for socket.io connections:

```sh
rhc set-env OPENSHIFT_NODEBB_WS_USE_APP_DNS=true -a nodebb

```

This will make socket.io connections insecure instead (thus not requiring a valid SSL certificate):

```sh
rhc set-env OPENSHIFT_NODEBB_WS_USE_INSECURE=true -a nodebb
```

Only one of those is needed and only when you want to use custom domain name. There is not much point in using both.

### 3. Restart NodeBB

This will restart your NodeBB installation using updated configuration variables.

```sh
rhc app restart nodebb
```

### 4. Test and retry

If option you selected in step 2 did not work, you can repeat steps 2 and 3 after removing previously selected option.

This will remove first option from step 2.

```sh
rhc unset-env OPENSHIFT_NODEBB_WS_USE_APP_DNS
```

This will remove second option from step 2.

```sh
rhc unset-env OPENSHIFT_NODEBB_WS_USE_INSECURE
```

Now you can go back to step 2 and try different option.

## Troubleshooting

### 1. Restart application

Sometimes OpenShift may forget to restart application after its repository is updated. In such case, your "https://nodebb-youropenshiftusername.rhcloud.com/" site may not work as it should. That can be fixed with a simple command:

```sh
rhc app restart
```

### 2. Missing "origin" remote

It looks like sometimes, for reasons unknown at the moment of writing this text, remote "origin" is missing. In such case you can run:

```sh
git remote add origin `rhc app show nodebb | grep -oh "ssh://[^\s]\{1,\}\.rhcloud\.com/~/git/[^\s]*"`
```

This should configure remote "origin" in your local git repository to point to your git repository on OpenShift servers.


## Acknowledgments

This guide wouldn't be possible without instructions from
https://github.com/NodeBB/nodebb-english/blob/master/installing/cloud/openshift.rst
and OpenShift documentation and examples from
https://developers.openshift.com/en/managing-action-hooks.html

It also wouldn't be created if not for numerous questions and conversations with Sylwester Cyba from http://nhl.pl/.

Part describing custom domain setup was created thanks to Benderwan (https://github.com/Benderwan) reporting problem and testing solutions (https://github.com/ahwayakchih/openshift-nodebb/issues/7).
