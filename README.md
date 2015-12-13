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
* **dev/publish:** directory for QGIS projects publishing


Development environment
-----------------------
**Dependencies:**  
* Linux or Mac
* Git
* VirtualBox
* Ansible

**Creating development environment:**  
* clone source code with Git

* start Vagrant in source code root directory
```
$ vagrant up
```

* log in to Vagrant virtual server
```
$ vagrant ssh
```

* download example QGIS project to '/vagrant/dev/publish' directory
```
$ mkdir -p /vagrant/dev/publish/user/natural-earth

$ cd /vagrant/dev/publish/user/natural-earth

$ wget https://raw.githubusercontent.com/imincik/gis-lab/master/gislab-project/natural-earth/natural-earth.sqlite
$ wget https://raw.githubusercontent.com/imincik/gis-lab/master/gislab-project/natural-earth/central-europe.qgs
$ wget https://raw.githubusercontent.com/imincik/gis-lab/master/gislab-project/natural-earth/central-europe.meta
```

* launch Django development server
```
$ cd /vagrant/dev
  &&
  workon gislab-web
  &&
  python ./manage.py runsslserver 0.0.0.0:8000
```

* launch example project in GIS.lab Web interface (execute on host machine)
```
$ firefox https://localhost:8000?PROJECT=user/natural-earth/central-europe
```

**Other commands:**  
* run Django server tests (run in '/vagrant/dev' dir)
```
$ python ./manage.py test webgis.viewer.tests
```


**Other information:**
* QGIS Mapserver is also forwarded to host machine on port 8090
* QGIS Mapserver logs can be found in '/var/log/lighttpd' directory


License
-------
GNU GPL 2.0 and higher versions.
