New generation of GIS.lab Web and Mobile clients
================================================


Web client
----------

For running and development of Web client application it is required to start
GIS.lab Web server (Django Webgis server) on port 8000.

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

All gulp commands (tasks) must be executed from /vagrant/clients/
directory with activated Node.js environment - `$ nvm use stable`


**Build production version:**

Build minified JavaScript/CSS files
```
$ gulp build-web
```

Enter URL below to open GIS.lab Web interface in web browser
([hyperlink](https://localhost:8000?PROJECT=user/natural-earth/central-europe))
```
https://localhost:8000?PROJECT=user/natural-earth/central-europe
```

**Running web client from source code:**

If debug version of OpenLayers 3 library is not already builded,
or webgis extension was changed (clients/src/ol3/), run
```
$ gulp build-ol3-debug
```

Start Node development server (default on port 8100):
```
$ gulp serve-web
```

Enter URL below to open GIS.lab Web interface in web browser
([hyperlink](http://localhost:8100?PROJECT=user/natural-earth/central-europe))
```
http://localhost:8100?PROJECT=user/natural-earth/central-europe
```

**Another gulp tasks:**

```
$ gulp lint
```
Checks JavaScript source files.

```
$ gulp icons-web
```
Builds icons - groups separated svg icons files into single svg
sprite file. (Production version must be builded again with
`$ gulp icons-web` command to use this new icons set).
