Application is split into 3 services running in docker containers:

#### QGIS Server
* Image: `gisquick/qgis-server`
* Volumes:
  - `/publish/` - for published Gisquick projects

#### Django Application (served with Gunicorn)
* Image: `gisquick/django`
* Volumes:
  - `/var/www/data/` - for sqlite database
  - `/var/www/media/` - for tilecache

Build:
```
$ docker build -f docker/django/Dockerfile -t gisquick/django:vue --build-arg version=dev .
```

#### Nginx Server
* Image: `gisquick/nginx`
* Volumes:
  - `/etc/letsencrypt/` - it must contain ssl certificates before starting container (fullchain.pem and privkey.pem in live/projects.gisquick.org/ folder)
  - `/var/www/certbot/` - when you intend to use *Webroot mode* to generate new or renew existing Certbot's ssl certificates


## SSL certificates

### Self-Signed certificate


```
$ openssl req -x509 -nodes -days 3650 -newkey rsa:2048 \
    -keyout privkey.pem \
    -out fullchain.pem \
    -subj "/C=CZ/ST=Prague/L=Prague/O=Gisquick/OU=IT Department/CN=projects.gisquick.org"
```


### Certbot (LetsEncrypt) certificate


Create empty folders for data volumes mounted by nginx container
```
$ mkdir -p /var/www/certbot
$ mkdir -p /etc/letsencrypt
```


Create certificate without running containers - using Standalone mode
```
$ docker run --rm -it \
    -v "/etc/letsencrypt/:/etc/letsencrypt/" \
    -p 80:80 -p 443:443 \
    certbot/certbot certonly --standalone --agree-tos \
    --email admin@gisquick.org \
    -d projects.gisquick.org
```


Create certificate with running containers - using Webroot mode
```
$ docker run --rm -it \
    -v "/var/www/certbot/:/var/www/certbot/" \
    -v "/etc/letsencrypt/:/etc/letsencrypt/" \
    certbot/certbot certonly --agree-tos \
    -a webroot --webroot-path /var/www/certbot/ \
    --email admin@gisquick.org \
    -d projects.gisquick.org
```


Renew certificate
```
$ docker run --rm -it \
    -v "/var/www/certbot/:/var/www/certbot/" \
    -v "/etc/letsencrypt/:/etc/letsencrypt/" \
    certbot/certbot renew --quiet
```


Reload NGINX server
```
$ docker kill -s HUP `docker ps -qf "ancestor=gisquick/nginx"`
```

## Localhost deployment

Prepare environment
```
$ cp example.docker-compose.yml docker-compose.yml

$ mkdir -p _data/data _data/media _data/publish _data/etc/letsencrypt/live/localhost

$ openssl req -x509 -nodes -days 3650 -newkey rsa:2048 \
    -keyout _data/etc/letsencrypt/live/localhost/privkey.pem \
    -out _data/etc/letsencrypt/live/localhost/fullchain.pem \
    -subj "/C=CZ/ST=State/L=City/O=Gisquick/OU=IT Department/CN=localhost"
```

Start all services (Gisquick will be running on https://localhost)
```
$ docker-compose up -d
```

Create database (django service must be running)
```
$ docker-compose exec django django-admin makemigrations viewer
$ docker-compose exec django django-admin migrate
```

Create superuser account
```
$ docker-compose exec django django-admin createsuperuser
```

Create regular users from admin interface running on https://localhost/admin
