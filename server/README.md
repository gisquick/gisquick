Important:
==========
Replace <QGIS-DATA> with directory of published QGIS projects (for example: /home/user/qgis/publish).
After installing lighttpd server (in next setp), ensure that lighttpd server will have permissions to
read files in this directory.


Install lighttpd server:
========================
sudo apt-get install lighttpd, xvfb


Configure Virtual frame buffer
------------------------------
(Info taken from http://www.itopen.it/qgis-server-setup-notes/)

Create file /etc/init.d/xvfb:
---------------------------------------------------------------------------------------------------------------

### BEGIN INIT INFO
# Provides: Xvfb
# Required-Start: $local_fs $remote_fs
# Required-Stop:
# X-Start-Before:
# Default-Start: 2 3 4 5
# Default-Stop: 0 1 6
# Short-Description: Loads X Virtual Frame Buffer
### END INIT INFO
 
XVFB=/usr/bin/Xvfb
XVFBARGS=":99 -screen 0 1024x768x24 -ac +extension GLX +render -noreset"
PIDFILE=/var/run/xvfb.pid
case "$1" in
  start)
    echo -n "Starting virtual X frame buffer: Xvfb"
    start-stop-daemon --start --quiet --pidfile $PIDFILE --make-pidfile --background --exec $XVFB -- $XVFBARGS
    echo "."
    ;;
  stop)
    echo -n "Stopping virtual X frame buffer: Xvfb"
    start-stop-daemon --stop --quiet --pidfile $PIDFILE
    echo "."
    ;;
  restart)
    $0 stop
    $0 start
    ;;
  *)
    echo "Usage: /etc/init.d/xvfb {start|stop|restart}"
    exit 1
esac
 
exit 0

---------------------------------------------------------------------------------------------------------------

$ chmod +x /etc/init.d/xvfb
$ update-rc.d xvfb defaults
$ sudo /etc/init.d/xvfb start


Configure lighttpd server (/etc/lighttpd/lighttpd.conf)
========================================================

server.modules = (
    "mod_access",
    "mod_alias",
    "mod_compress",
    "mod_redirect",
    "mod_fastcgi",
    "mod_rewrite",
)

server.document-root        = "/var/www"
server.upload-dirs          = ( "/var/cache/lighttpd/uploads" )
server.errorlog             = "/var/log/lighttpd/error.log"
server.pid-file             = "/var/run/lighttpd.pid"
server.username             = "www-data"
server.groupname            = "www-data"
server.port                 = 80


index-file.names            = ( "index.php", "index.html", "index.lighttpd.html" )
url.access-deny             = ( "~", ".inc" )
static-file.exclude-extensions = ( ".php", ".pl", ".fcgi" )

compress.cache-dir          = "/var/cache/lighttpd/compress/"
compress.filetype           = ( "application/javascript", "text/css", "text/html", "text/plain" )

# default listening port for IPv6 falls back to the IPv4 port
## Use ipv6 if available
#include_shell "/usr/share/lighttpd/use-ipv6.pl " + server.port
include_shell "/usr/share/lighttpd/create-mime.assign.pl"
include_shell "/usr/share/lighttpd/include-conf-enabled.pl"


# QGIS Mapserver configuration

fastcgi.server = (
    "/cgi-bin/qgis_mapserv.fcgi" => ((
        "socket" => "/tmp/fastcgi-qgis-server.socket",
        "bin-path" => "/usr/lib/cgi-bin/qgis_mapserv.fcgi",
        "bin-environment" => (
            "DISPLAY" => ":99"
        ),
        "max-procs" => 1,
        "check-local" => "disable"
    ))
)

url.rewrite-once = (
    "^(.*)MAP=(.*)$" => "$1MAP=<QGIS-DATA>/$2",
)

----------------------------------------------------------------------------------------------------------

$ sudo service lighttpd restart


Install QGIS server:
====================
sudo apt-get install qgis-server



Configure Webgis server for development
=======================================


$ sudo apt-get install libldap2-dev libsasl2-dev

Create Python virtual environment for Webgis server:

$ mkvirtualenv --system-site-packages <name>
$ workon <name>

$ cd <gislab-web-mobile>/server
$ pip install -r requirements.txt
$ pip install django-sslserver

Create Webgis Django project (server instance):

$ django-admin.py startproject --template=webgis/conf/project_template/ <project-name> [<webgis-server-project-directory>]
Note: Name of the project must be valid name for Python module!

Example:
--------
$ mkdir webgis-dev-server
$ django-admin.py startproject --template=webgis/conf/project_template/ webgisdev webgis-dev-server


Configure <webgis-server-project-directory>/<project-name>/settings.py file:
----------------------------------------------------------------------------

# Set root directory of published QGIS projects
GISLAB_WEB_PROJECT_ROOT = '<QGIS-DATA>/'


# Add 'sslserver' into the list of INSTALLED_APPS
INSTALLED_APPS = (
    'sslserver',
    'corsheaders',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.staticfiles',
    'webgis.viewer',
    'webgis.storage',
    'webgis.mapcache',
    'webgis.mobile',
)

------------------------------------------------------------------------------------

Create database and superuser account

$ export PYTHONPATH=<gislab-web-mobile>/server/

$ cd <webgis-server-project-directory>

$ python manage.py migrate
$ python manage.py createsuperuser


Build web client application:
=============================
Install Node.js (npm)
Install 'nodejs' Ubuntu package or install nvm (Node Version Manager) https://github.com/creationix/nvm

Install Gulp
$ npm install -g gulp

$ cd <gislab-web-mobile>/clients
$ npm install
$ npm install web/
$ gulp


Run Webgis server:
==================

$ export PYTHONPATH=<gislab-web-mobile>/server/
$ cd <webgis-server-project-directory>
$ python manage.py runsslserver

Open QGIS project in web browser:

https://localhost:8000/?PROJECT=<project-path>
Add security exception in web browser


