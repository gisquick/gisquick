
FROM ubuntu:16.04 AS builder
MAINTAINER Marcel Dancak "dancakm@gmail.com"

ARG version

# Install system packages
RUN apt-get update && apt-get install -y --no-install-recommends \
    python-setuptools \
    python-pip \
    git \
    apt-utils \
    patch \
    curl \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*


RUN curl -sL https://deb.nodesource.com/setup_4.x | bash -
RUN apt-get install -y nodejs


COPY ./server/ /gisquick/server
COPY ./clients/ /gisquick/clients/

WORKDIR /gisquick/clients/
RUN npm install && \
    npm install web && \
    npm install -g gulp

RUN gulp icons-web && \
    gulp build-web && \
    gulp build-userpage

WORKDIR /gisquick/server
RUN echo "VERSION = '${version}'" > webgis/__init__.py && \
    python setup.py sdist

CMD echo 'Build is finished.'


FROM ubuntu:16.04

ARG version

# Install system packages
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3-setuptools \
    python3-pip \
    python3-owslib \
    supervisor \
    sqlite3 \
    && rm -rf /var/lib/apt/lists/*


# Install Gunicorn and GIS.lab Web dependencies
COPY --from=builder /gisquick/server/dist/gisquick-${version}.tar.gz /tmp/gisquick.tar.gz

RUN pip3 install --no-cache-dir 'gunicorn>=19.7,<19.8' && \
    pip3 install --no-cache-dir /tmp/gisquick.tar.gz && \
    rm /tmp/gisquick.tar.gz


# Create GisQuick Django project
RUN mkdir -p /var/www/gisquick && \
    mkdir -p /var/log/django/ && \
    mkdir -p /var/log/gunicorn/ && \
    django-admin startproject --template=/usr/local/lib/python3.5/dist-packages/webgis/conf/project_template/ djproject /var/www/gisquick/

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
