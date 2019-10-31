FROM node:12-alpine AS webapp
MAINTAINER Marcel Dancak "dancakm@gmail.com"

WORKDIR /gisquick-web/
COPY ./clients/gisquick-web/package*.json ./
RUN npm install

COPY ./clients/gisquick-web ./
RUN npm run build


FROM ubuntu:18.04
ARG version

# Install system packages
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3-setuptools \
    python3-pip \
    python3-owslib \
    sqlite3 \
    python3-psycopg2 \
    gdal-bin \
    proj-bin \
    postgresql-client \
    && rm -rf /var/lib/apt/lists/*

RUN pip3 install --no-cache-dir 'gunicorn>=19.9,<20.0' && \
    pip3 install --no-cache-dir 'supervisor>=4.1.0,<4.2.0'

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
ENV LANG C.UTF-8


# Configure Gunicorn and Supervisor
COPY ./docker/django/gunicorn_conf.py /var/www/gisquick/gunicorn_conf.py
COPY ./docker/django/supervisord.conf /etc/supervisor/conf.d/supervisord.conf


VOLUME /var/www/gisquick/static/
VOLUME /var/www/gisquick/media/
VOLUME /var/www/gisquick/data/
EXPOSE 8000

CMD ["supervisord", "-c", "/etc/supervisor/conf.d/supervisord.conf"]
