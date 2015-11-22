# GIS.lab Web server

## Creating development environment

### Requirements
* install server requirements
```bash
$ sudo apt-get install --no-install-recommends qgis-server lighttpd
```

* install Python development packages
```
$ sudo apt-get install --no-install-recommends python-dev virtualenvwrapper
```

* install Javascript development packages
```
$ sudo apt-get install nodejs npm
$ npm install -g gulp
```

* create directory for published projects
```
$ mkdir -p /tmp/gislab-web
```

### QGIS Server and Lighttpd configuration
* /etc/lighttpd/lighttpd.conf
```
server.modules += (
    "mod_fastcgi",
    "mod_alias",
    "mod_rewrite",
)

server.port                     = 80
server.use-ipv6                 = "disable"
server.document-root            = "/var/www"
server.pid-file                 = "/var/run/lighttpd.pid"
server.username                 = "www-data"
server.groupname                = "www-data"
server.upload-dirs              = ( "/var/cache/lighttpd/uploads" )

index-file.names                = ( "index.html" )
static-file.exclude-extensions  = ( ".php", ".pl", ".fcgi" )


alias.url = ( "/cgi-bin/" => "/usr/lib/cgi-bin/" )

fastcgi.server = (
    "/cgi-bin/" => ((
        "bin-path" => "/usr/lib/cgi-bin/qgis_mapserv.fcgi",
        "socket" => "/tmp/qgs_mapserv.socket",
        "max-procs" => 1,
        "check-local" => "disable"
    ))
)

url.rewrite-once = (
    "^(.*[?&])(?i)MAP=(.*)$" => "$1MAP=/tmp/gislab/publish/$2",
)


# logging
server.errorlog-use-syslog      = "enable"

server.modules                  += ( "mod_accesslog" )
accesslog.use-syslog            = "enable"


# includes
include_shell "/usr/share/lighttpd/create-mime.assign.pl"
include_shell "/usr/share/lighttpd/include-conf-enabled.pl"
```

* restart Lighttpd service
```bash
$ sudo service lighttpd restart
```

* test configuration
```
$ curl "http://localhost/cgi-bin/qgis_mapserv.fcgi?SERVICE=WMS&REQUEST=GetCapabilities"
```

### Source code
* download source code
```bash
$ git clone git@github.com:imincik/gislab-web-mobile.git
```

### Django development project
* create Python virtualenv
```bash
$ mkvirtualenv --system-site-packages gislab-web
$ workon gislab-web
```

* install Python dependencies
```bash
$ pip install -r server/requirements.txt
$ pip install django-sslserver
```

* add Python modules on path (run in 'gislab-web-mobile' dir)
```bash
$ add2virtualenv server
```

* set environemnt variable (run in 'gislab-web-mobile/server' dir)
```bash
$ unset DJANGO_SETTINGS_MODULE
$ export PYTHONPATH=$(pwd)
```

* create Django project (run in 'gislab-web-mobile/server')
```bash
$ mkdir dev
$ django-admin.py startproject --template=webgis/conf/project_template/ devproj dev
```

* configure `dev/devproj/settings.py` file:
```python
# Add 'sslserver' into the list of INSTALLED_APPS
INSTALLED_APPS = (
    'sslserver',
    'corsheaders',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.staticfiles',
    'webgis.viewer',
    'webgis.mapcache',
    'webgis.mobile',
)
```

* create database (run in 'gislab-web-mobile/server/dev')
```bash
$ python ./manage.py migrate
```

* create superuser account (run in 'gislab-web-mobile/server/dev/devproj')
```bash
$ python ./manage.py createsuperuser --username admin --email admin@dev.io
```

### Javascript client build
* build web client (run in 'gislab-web-mobile/clients')
```bash
$ npm install
$ npm install web/
$ gulp
```

### Run GIS.lab Web
* run Django development server (run in 'gislab-web-mobile/server/dev')
```bash
$ python ./manage.py runsslserver
```

* open 'Empty' GIS.lab Web project
```
https://localhost:8000/?PROJECT=<project-path>
```

* copy published QGIS project to '/tmp/gislab-web' and open it
```
https://localhost:8000/?PROJECT=<USER>/<PROJECT-PATH>
```
