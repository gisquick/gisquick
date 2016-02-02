GIS.lab Web New Generation (in development)
===========================================
New generation of GIS.lab Web infrastructure for publishing QGIS projects in
Web.


Features
--------

GIS.lab QGIS plugin
...................

TODO: screenshot

* building publishing bundle from QGIS Desktop project
* adding base layers
* creating topics from layers list
* setting access constraints
* setting project expiration


GIS.lab Web
...........

TODO: screenshot

* responsive web interface design


GIS.lab Web User Console
........................

TODO: screenshot

* projects and OWS services management


GIS.lab Mobile
..............

TODO: screenshot

* dedicated hybrid Android client interface built on top of the same code base
  as web inteface with native UI


Tiles cache
...........
* automatic tiles caching


Core technologies
-----------------
* QGIS Desktop and Mapserver
* OpenLayers 3
* AngularJS, Angular UI, Angular Material
* Onsen
* Cordova
* Django
* Python


Typical work flow
-----------------
* load, configure and style layers in QGIS Desktop project
* install QGIS GIS.lab Web plugin to publish QGIS project
* copy QGIS project with all associated data to GIS.lab Web server
* open GIS.lab Web User Console and launch published project in web interface
* optionaly install and use Android client interface


Source code layout
------------------
* **clients:**    web and mobile client interfaces
* **server:**     Django server
* **qgis:**       QGIS plugin
* **provision:**  development environment provisioning configuration
                  (Vagrant/Ansible)
* **dev:**        development directory
* **dev/django:** directory for Django development project created during
                  provisioning
* **dev/publish/user:** directory for QGIS projects publishing (as user 'user')


Development environment
-----------------------
**Dependencies:**  
* Linux or Mac
* Git
* VirtualBox
* Vagrant
* Ansible

**Creating development environment:**  
* clone source code with Git

* start Vagrant in source code root directory  
  *Note: to speed up provisioning using Apt proxy server, set APT_PROXY variable
  before running this command (ex.: export APT_PROXY=http://192.168.99.118:3142).
  See [Apt Cacher server](https://github.com/gislab-npo/gislab/wiki/Apt-Cacher-server) instructions for details.*
```
$ vagrant up
```

* log in to Vagrant virtual server
```
$ vagrant ssh
```

* run simple development environment in TMUX (to quit running session type 'tmux kill-session')
```
$ /vagrant/utils/tmux-dev.sh
```
OR
* launch Django development server manually
```
$ cd /vagrant/dev/django \
  && \
  workon gislab-web \
  && \
  python ./manage.py runsslserver 0.0.0.0:8000
```

* enter URL below to open GIS.lab Web interface in web browser
```
https://localhost:8000?PROJECT=user/natural-earth/central-europe
```

**Other commands:**  
* run Django server tests (run in '/vagrant/dev/django' dir)
```
$ python ./manage.py test webgis.viewer.tests
```


**Other information:**
* QGIS Mapserver is also forwarded to host machine on port 8090
* QGIS Mapserver logs can be found in '/var/log/lighttpd' directory


Configuration
-------------
Configuration is done by Django project settings file. Good practise is to place
*settings_custom.py* file to the same directory where *settings.py* to override
default values.


Packaging
---------
*TODO: add instructions how to clean environment before build*

* GIS.lab Web QGIS plugin
```
$ cd /vagrant/qgis/gislab_web \
  && \
  make clean \
  && \
  make compile \
  && \
  make zip
```

* GIS.lab Web
```
$ cd /vagrant/server \
  && \
  python ./setup.py sdist
```

* GIS.lab Mobile
```
$ nvm use stable

$ export ANDROID_HOME=/home/vagrant/dev/apps/android-sdk-linux \
         PATH=$PATH:/home/vagrant/dev/apps/android-sdk-linux/tools:/home/vagrant/dev/apps/android-sdk-linux/platform-tools \
         ANDROID_BUILD=ant \
  && \
  cd /vagrant/clients/mobile/cordova-app \
  && \
  cordova build android
```

License
-------
GNU GPL 2.0 and higher versions.
