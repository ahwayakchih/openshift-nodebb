NodeBB in the OpenShift cloud
=============================

This document will guide you through the process of installing NodeBB (http://www.nodebb.org) in the OpenShift cloud (https://www.openshift.com/). It will also let you know how to keep NodeBB updated afterwards.

Before continuing, you should know how to open and use command line on your system. This guide does not describe how to do that.


## Prerequisites

First of all, you need an OpenShift account. If you do not have one yet, now is the time to register at https://www.openshift.com/app/account/new.

Next, install `rhc` application, as described at https://developers.openshift.com/en/managing-client-tools.html.

After that, you should have working `rhc` and `git` available on your system. If you had to install `git`, make sure that you configured your identity, as described at: https://git-scm.com/book/en/v2/Getting-Started-First-Time-Git-Setup#Your-Identity.


## Installation

To install NodeBB, follow these steps (they were tested using `bash` shell), without omitting any of them (unless stated otherwise), on your local system (NOT on the OpenShift side, through SSH).

### 1. Creating a new application

```sh
rhc app create nodebb http://cartreflect-claytondev.rhcloud.com/github/icflorescu/openshift-cartridge-nodejs NODE_VERSION_URL=https://semver.io/node/resolve/0.10
```

That should create your local copy of your OpenShift repository in a directory called "nodebb". If it does not, check if there were some errors in the output and maybe try again before continuing. Without that directory, rest of the steps will not work as they should.

### 2. Adding database cartridge

NodeBB supports both Redis and MongoDB databases. It's up to you to decide which one to use. If you to not know anything about that, just select first one.

To use MongoDB local to OpenShift server, run:

```sh
rhc cartridge add mongodb-2.4 -a nodebb
```

To use Redis local to OpenShift server, run:

```sh
rhc cartridge add http://cartreflect-claytondev.rhcloud.com/github/transformatordesign/openshift-redis-cart -a nodebb
```

To use third party MongoDB Database-as-a-Service from MongoLab, go to https://marketplace.openshift.com/login, add MongoLab subscription and connect it to the nodebb application (read more about that at https://developers.openshift.com/en/marketplace-mongolab.html).

Only one of them is needed, there is no point in adding more than one database.

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

This will clean up directory from example stuff that node js cartridge created.

```sh
rm -rf `ls` .eslintrc && git commit -a -m 'Cleaned up for NodeBB'
```

This will import source code of NodeBB v0.9.x. To import different version instead, go to https://github.com/NodeBB/NodeBB, see what version branches are available and replace "v0.9.x" with selected version number.

```sh
git pull --no-edit -s recursive -X theirs upstream v0.9.x
```

This guide was tested with `v0.6.x`, `v0.7.x`, `v0.8.x`, and `v0.9.x` branches.

### 5. Add OpenShift-NodeBB repository

This will allow to import patches and action_hooks needed to use NodeBB without worrying too much about dynamic IP and/or port number changes or files uploaded by users disappearing.

```sh
git remote add openshift -m master https://github.com/ahwayakchih/openshift-nodebb.git
```

### 6. Import OpenShift-NodeBB

This will import scripts and patches mentioned in previous step.

```sh
git pull --no-edit -s recursive -X theirs openshift master
```

### 7. Push everything to application repository

This will push everything to OpenShift servers, deploy and start NodeBB.

```sh
git push origin master
```

### 8. That's it!

After a while, you should be able to see something like this near the end of a long text output from previous command:

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
	.  Please wait for NodeBB to start.
	.
	.  WARNING: Be sure to change admin e-mail and
	.           password after first log in!
	^-============================================-^
```

And then:

```
	.-============================================-.
	.  NodeBB is ready.
	.
	.  You can visit it at:
	.  https://nodebb-youropenshiftusername.rhcloud.com/
	.
	.  You can log in to it at:
	.  https://nodebb-youropenshiftusername.rhcloud.com/login
	^-============================================-^
```

Use that new admin login and password to log in to your new NodeBB installation, and change them to something suitable for you.

## Admin Recovery (MongoDB) / Custom Admin Account

In case you skipped past the above dialog and didn't save your forum's admin password you can add admin users yourself.

### Step 1. First register on your forum as yourself or with an alternate email

We'll be turning this account into another admin to manage your site.

### Step 2. Add the RockMongo cartridge to your app

You may also install rockmongo from the webconsole <a href="https://openshift.redhat.com/app/console/applications" target="_blank">https://openshift.redhat.com/app/console/applications</a> if you choose

```
rhc cartridge add rockmongo-1.1 -a nodebb
```

### Step 3. Login to RockMongo

You can now visit https://nodebb-yoursubdomain.rhcloud.com/rockmongo/ to login
You can find your credentials in the webconsole if you lose them <a href="https://openshift.redhat.com/app/console/applications" target="_blank">https://openshift.redhat.com/app/console/applications</a>

### Step 4. Navigate to Nodebb's database table

Openshift's database name will match the name of your application so following all of the above examples
Navigate yourself to nodebb > objects

### Step 5. Get your user's id

Run this query in rockmongo, this will return a list of all your forum's users, find the one you just created.

```
{ 
	"_key" : "username:uid" 
} 
```

You may also narrow your search query by your username instead, take note of which key is related to usernames. This is likely the "value" key.

```
{
	"_key" : "username:uid",
	"value" : "youremail@example.com"
}
```

When you find your user's record make a note of the number inside NumberInt(?) this is your user's id which we'll use later

### Step 6. Add your new account to the administrators group

This query returns the record which maintains who is on the admin list, we'll edit this record by adding our new user's id

```
{ 
	"_key" : "group:administrators:members" 
}
```

Click Update on the record that was returned by this query and modify eaither the "values" key or "members" key (whichever is available, depends on your version of NodeBB) make sure it reflects the list of users you actually want to be admins. You may use this also to remove admin priviledges. EG if I want user 1 and user 2 to be admins...

```
{
	"_key": "group:administrators:members",
	...
	"value": [
		"1",
		"2"
	]
}
```

Click Save

### Step 7. Enjoy your admin priviledges

Login as your new registered user and you will now have access to the admin panel and all other perks associated with an admin account. Huzzah!

## Updates

From now on, every time you want to update NodeBB, you can simply follow three steps. Follow them on your local system (NOT on the OpenShift side, through SSH).

### 1. Pull changes

This will change current working directory to the one used for NodeBB. 

```sh
cd nodebb
```

Update NodeBB source code:

```sh
git pull --no-edit -s recursive -X theirs upstream v0.9.x
```

If you want to jump to new version, simply replace "v0.9.x" with another branch name. Keep in mind, however, that it will work only for an uprade (it is possible to downgrade, just not with that single pull command).

Update OpenShift-NodeBB patches:

```sh
git pull --no-edit -s recursive -X theirs openshift master
```

### 2. Push changes

```sh
git push origin master
```

### 3. That's it!

After a while (sometimes quite a long while), you should be able to see something like this near the end of a long text output from previous command:

```
	.-============================================-.
	.  Setup Finished.
	.
	.  Please wait for NodeBB to start.
	^-============================================-^
```

And then:

```
	.-============================================-.
	.  NodeBB is ready.
	.
	.  You can visit it at:
	.  https://nodebb-youropenshiftusername.rhcloud.com/
	.
	.  You can log in to it at:
	.  https://nodebb-youropenshiftusername.rhcloud.com/login
	^-============================================-^
```


## Plugins

If you just want to test things and look around, you can simply install/enable plugins through administration pages.

If you want to keep NodeBB running in the OpenShift cloud, you should add plugins through your repository instead. That is because OpenShift may erase all the files on server whenever you push changes to your repository.
NodeBB can install plugins, but it will not add them to the "package.json" file, nor it will commit changes to your repository.

To keep plugins installed and working between updates, you can install them using `npm`. Follow these steps on your local system (NOT on the OpenShift side, through SSH).

### 1. Install plugin locally

This will change current working directory to the one used for NodeBB. 

```sh
cd nodebb
```

As an example, this will install "Question and Answer" plugin (https://github.com/psychobunny/nodebb-plugin-question-and-answer).

```sh
npm install --production --save nodebb-plugin-question-and-answer
```

Plugin will be installed locally and information about it will be saved to the "package.json" file.

Change the name of the module (`nodebb-plugin-question-and-answer` in the example above) to install plugin of your choice. Just remember to keep the `npm install --production --save ` part of the command intact.

### 2. Commit changes

This will commit modifications to your local repository.

```sh
git commit -a -m 'Added QA plugin'
```

Of course, instead of `Added QA plugin` you can write any other one-liner that explains what was changed.

### 3. Push changes

```
git push origin master
```


## Custom domain name

If you want to use your own domain name, instead of subdomain in domain provided by OpenShift, you can add alias to your application.
There is only one ceveat: to use HTTPS with your own domain name, you have to upgrade your OpenShift plan. Otherwise there is no way to set up correct SSL certificate and you will keep bumping into problems.

So in short, here is when you can use HTTPS:

- OpenShift domain
- Custom domain only on premium plan

You can read more about that at https://developers.openshift.com/en/managing-domains-ssl.html

There's no known way for NodeBB to work 100% correctly with both HTTPS and custom domain name on a free plan. CloudFlare does not seem to provide support for SSL websockets for anything below Enterprise plan.

As usual, follow these steps on your local system (NOT on the OpenShift side, through SSH).

### 1. Add domain name to application

```sh
rhc alias add nodebb example.com
```

Of course, instead of `example.com` enter your own domain name.

### 2. Add domain name to NodeBB

This will make NodeBB installation work correctly with your custom domain name.

```sh
rhc env set OPENSHIFT_APP_DNS_ALIAS=example.com -a nodebb
```

Again, use your own domain name in place of `example.com`.

### 3. Optional SSL

If your account is on one of paid "premium" plans, you can add SSL certificate to enable valid usage of HTTPS with your custom domain name.
You can get free, widely accepted certificates from https://letsencrypt.org/.

Once you have a key and a certificate, this will add them to application:

```sh
rhc alias update-cert nodebb example.com --certificate cert_file --private_key key_file
```

Use your own domain name in place of `example.com`, and correct files in place of `cert_file` and `key_file`.
Read more about setting up SSL at https://developers.openshift.com/en/managing-domains-ssl.html#_command_line_rhc_3

You can add certificates at some point in future. Just remember to restart application after that.

### 4. Restart NodeBB

This will restart your NodeBB installation, so it can use updated configuration variables.

```sh
rhc app restart nodebb
```

### 5. Configure DNS

Last thing to do is to configure DNS for your domain name to point to your OpenShift domain name. You can read more about that at https://developers.openshift.com/en/managing-domains-ssl.html#_step_2_configure_your_dns_host_records.

Please note that some DNS changes may take up to 24 hours before propagating, so if your NodeBB site is not accessible through custom domain name, it may just be that you have to wait a bit before it starts working.

If later you decide to change the domain name, simply repeat steps 1 to 5.


## Troubleshooting

### 1. Installation/Update error

When something goes wrong with installation or update, you should see something like this near the end of a long text output:

```
	.-============================================-.
	.  Setup failed.
	.
	.  There was a problem completing NodeBB setup.
	.
	.  Check logfile for more information:
	.  logs/openshift-nodebb-setup.log
	^-============================================-^
```

It may be either "Setup failed" or "NodeBB failed to start".

Path to logfile is local to OpenShift server, so to check that file you can either log in to server through SSH or copy file to your local directory.

This will copy log file from OpenShift server to your local directory.

```sh
rhc scp nodebb download ./ app-root/repo/logs/openshift-nodebb-setup.log
```

Use whatever path was mentioned in error message in place of "logs/logs/openshift-nodebb-setup.log".

Once you have the log file, you can either check it yourself or post an issue at https://github.com/ahwayakchih/openshift-nodebb/issues (describing the steps you made and copying and pasting content of the logfile).

### 2. Restart application

From time to time something may go wrong while OpenShift tries to restart application, e.g., after its repository is updated. In such case, your NodeBB site may not work as it should. Sometimes that can be fixed with a simple command:

```sh
rhc app restart
```

### 3. Add missing "origin" remote

It looks like sometimes, for reasons unknown at the moment of writing this text, remote "origin" is missing. In such case you can run:

```sh
cd nodebb
```

and then:

```sh
git remote add origin `rhc app show nodebb | grep -oh "ssh://\S\{1,\}\.rhcloud.com/~/git/\S*"`
```

This should configure remote "origin" in your local git repository to point to your git repository located on the OpenShift servers.

### 4. Remove custom domain name

If you want to remove custom domain name, this will stop NodeBB from using it:

```sh
rhc env unset OPENSHIFT_APP_DNS_ALIAS
```

If you did add certificate, this will remove it:

```sh
rhc alias delete-cert nodebb example.com
```

Finally, this will stop OpenShift from using your domain name:

```sh
rhc alias remove nodebb example.com
```


## Acknowledgments

This guide wouldn't be possible without instructions from
https://github.com/NodeBB/nodebb-english/blob/master/installing/cloud/openshift.rst
and OpenShift documentation and examples from
https://developers.openshift.com/en/managing-action-hooks.html

It also wouldn't be created if not for numerous questions and conversations with Sylwester Cyba from http://nhl.pl/.

Part describing custom domain setup was created thanks to Benderwan (https://github.com/Benderwan) reporting problem and testing solutions (https://github.com/ahwayakchih/openshift-nodebb/issues/7).
