FROM node:12-alpine AS webapp
MAINTAINER Marcel Dancak "dancakm@gmail.com"

COPY ./clients/gisquick-web/ /gisquick-web/
WORKDIR /gisquick-web/
RUN npm install
RUN npm run build


FROM ubuntu:18.04
ARG version

# Install system packages
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3-setuptools \
    python3-pip \
    python3-owslib \
    supervisor \
    sqlite3 \
    && rm -rf /var/lib/apt/lists/*

RUN pip3 install --no-cache-dir 'gunicorn>=19.7,<19.8'

COPY ./server/ /gisquick/server/
COPY --from=webapp /gisquick-web/dist/static/ /gisquick/server/webgis/viewer/static/
COPY --from=webapp /gisquick-web/dist/templates/index.html /gisquick/server/webgis/viewer/templates/viewer/index.html

RUN echo "VERSION = '${version}'" > /gisquick/server/webgis/__init__.py && \
    pip3 install -e /gisquick/server/

# Create Gisquick Django project
RUN mkdir -p /var/www/gisquick && \
    mkdir -p /var/log/django/ && \
    mkdir -p /var/log/gunicorn/ && \
    django-admin startproject --template=/gisquick/server/webgis/conf/project_template/ djproject /var/www/gisquick/

COPY ./docker/django/settings_custom.py /var/www/gisquick/djproject/settings_custom.py

ENV PYTHONPATH $PYTHONPATH:/var/www/gisquick/
ENV DJANGO_SETTINGS_MODULE djproject.settings


# Configure Gunicorn and Supervisor
COPY ./docker/django/gunicorn_conf.py /var/www/gisquick/gunicorn_conf.py
COPY ./docker/django/supervisord.conf /etc/supervisor/conf.d/supervisord.conf


VOLUME /var/www/gisquick/static/
VOLUME /var/www/gisquick/media/
VOLUME /var/www/gisquick/data/
EXPOSE 8000

CMD ["/usr/bin/supervisord", "-c", "/etc/supervisor/conf.d/supervisord.conf"]
