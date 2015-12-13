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
* Linix or Mac
* Git
* VirtualBox
* Ansible

**Creating development environment:**  
* clone source code with Git

* start Vagrant in source code root directory
```
$ vagrant up
```
