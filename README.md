GIS.lab Web and Mobile
======================
New generation of GIS.lab Web and Mobile client interfaces for QGIS projects
publishing.


Source code layout
------------------
* **clients:**   web and mobile client interfaces
* **server:**    Django server
* **qgis:**      QGIS plugin
* **provision:** development environment provisioning configuration
                 (Vagrant/Ansible)
* **dev:**       directory for Django development project created during
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
  before running this command (ex.: export APT_PROXY=http://192.168.99.118:3142)*
```
$ vagrant up
```

* log in to Vagrant virtual server
```
$ vagrant ssh
```

* run simple development environment in TMUX
```
$ bash /vagrant/utils/tmux-dev.sh
```
OR
* launch Django development server manually
```
$ cd /vagrant/dev \
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
* run Django server tests (run in '/vagrant/dev' dir)
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
$ nvm use <NODE-VERSION>

$ export ANDROID_HOME=/home/vagrant/android-sdk-linux \
         PATH=$PATH:/home/vagrant/android-sdk-linux/tools:/home/vagrant/android-sdk-linux/platform-tools \
         ANDROID_BUILD=ant \
  && \
  cd /vagrant/clients/mobile/cordova-app \
  && \
  cordova build android
```

License
-------
GNU GPL 2.0 and higher versions.
