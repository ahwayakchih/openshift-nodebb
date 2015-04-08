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
rhc add-cartridge http://cartreflect-claytondev.rhcloud.com/reflect?github=smarterclayton/openshift-redis-cart -a nodebb
```

To use MongoDB, run:

```sh
rhc cartridge add mongodb-2.4 -a nodebb
```

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

This will import source code of NodeBB v0.6.x. To import different version instead, go to https://github.com/NodeBB/NodeBB, see what version branches are available and replace "v0.6.x" with selected version name.

```sh
git pull --no-edit -s recursive -X theirs upstream v0.6.x
```

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
git pull --no-edit -s recursive -X theirs upstream v0.6.x
```

If you want to jump to new version, just replace "v0.6.x" with different branch name. Just remember, that it will work only for uprade (it is possible to downgrade, just not with that single pull command).

Update OpenShift-NodeBB patches:

```sh
git pull --no-edit -s recursive -X theirs openshift master
```

### 2. Push changes

```sh
git push origin master
```

### 3. That's it!

After a while, you should be able to see something like this at the end of a long text output from previous command:

```
	.-============================================-.
	.  Setup Finished.
	.
	.  You can view your NodeBB at:
	.  https://nodebb-youropenshiftusername.rhcloud.com/
	^-============================================-^
```


## Troubleshooting

### 1. Restart application

Sometimes OpenShift may not restart application after its repository is updated. In such case, your "https://nodebb-youropenshiftusername.rhcloud.com/" site may not work as it should. That can be fixed with a simple command:

```sh
rhc app restart
```


## Acknowledgments

This guide wouldn't be possible without instructions from
https://github.com/NodeBB/nodebb-english/blob/master/installing/cloud/openshift.rst
and OpenShift documentation and examples from
https://developers.openshift.com/en/managing-action-hooks.html

It also wouldn't be created if not for the questions and conversations with Sylwester Cyba from http://nhl.pl/.
