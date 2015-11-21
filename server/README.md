#### Note:

Create directory for published QGIS projects. In the following configuration,
`/home/user/qgis/publish` location will be used. After installing lighttpd server,
ensure that lighttpd server have permissions to read files in this directory.


### Install QGIS Mapserver and lighttpd server:

```bash
$ sudo apt-get install qgis-server, lighttpd, xvfb
```

#### Configure Virtual frame buffer

(Info taken from http://www.itopen.it/qgis-server-setup-notes/)

Create file /etc/init.d/xvfb:

```bash
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
```

```bash
$ chmod +x /etc/init.d/xvfb
$ update-rc.d xvfb defaults
$ sudo /etc/init.d/xvfb start
```

Configure lighttpd server - `/etc/lighttpd/lighttpd.conf`

```
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
    "^(.*)MAP=(.*)$" => "$1MAP=/home/user/qgis/publish/$2",
)
```

```bash
$ sudo service lighttpd restart
```


### Configure Webgis server for development

Create Python virtual environment for Webgis server:

```bash
$ mkvirtualenv --system-site-packages <name>`
$ workon <name>`

$ pip install -r server/requirements.txt
$ pip install django-sslserver
```

Create Webgis Django project (server instance). Name of the project must be valid name for Python module.

```bash
$ django-admin.py startproject --template=webgis/conf/project_template/ <project-name> [<webgis-server-project-directory>]
```

Example:

```bash
$ mkdir webgis-dev-server
$ django-admin.py startproject --template=webgis/conf/project_template/ webgisdev webgis-dev-server
```

Configure `<webgis-server-project-directory>/<project-name>/settings.py` file:

```python
# Set root directory of published QGIS projects
GISLAB_WEB_PROJECT_ROOT = '/home/user/qgis/publish/'


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
```

Create database and superuser account

```bash
$ export PYTHONPATH=<gislab-web-mobile>/server/
$ cd <webgis-server-project-directory>
$ python manage.py migrate
$ python manage.py createsuperuser
```

#### Build web client application:

Install Node.js (npm) - install 'nodejs' Ubuntu package or [nvm (Node Version Manager)](https://github.com/creationix/nvm)

Install Gulp
```bash
$ npm install -g gulp
```

```bash
$ cd <gislab-web-mobile>/clients
$ npm install
$ npm install web/
$ gulp
```

#### Run Webgis server:

```bash
$ export PYTHONPATH=<gislab-web-mobile>/server/
$ cd <webgis-server-project-directory>
$ python manage.py runsslserver
```

Open QGIS project in web browser (you will have to confirm security exception).

`https://localhost:8000/?PROJECT=<project-path>`
