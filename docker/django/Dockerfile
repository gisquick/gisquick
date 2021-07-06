FROM ubuntu:18.04
ARG version

# Install system packages
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3-setuptools \
    python3-pip \
    sqlite3 \
    python3-psycopg2 \
    && rm -rf /var/lib/apt/lists/*

RUN pip3 install --upgrade pip && \
    pip3 install --no-cache-dir 'gunicorn>=19.9,<20.0' && \
    pip3 install --no-cache-dir 'supervisor>=4.1.0,<4.2.0'

COPY ./server/ /gisquick/server/
RUN pip3 install --no-cache-dir -r /gisquick/server/requirements.txt

# Create Gisquick Django project
RUN echo "VERSION = '${version}'" > /gisquick/server/webgis/__init__.py && \
    pip3 install -e /gisquick/server/ && \
    mkdir -p /var/www/gisquick && \
    mkdir -p /var/log/django/ && \
    mkdir -p /var/log/gunicorn/ && \
    django-admin startproject --template=/gisquick/server/webgis/conf/project_template/ djproject /var/www/gisquick/


ENV PYTHONPATH $PYTHONPATH:/var/www/gisquick/
ENV DJANGO_SETTINGS_MODULE djproject.settings
ENV LANG C.UTF-8


# Configure Gunicorn and Supervisor
COPY ./docker/django/gunicorn_conf.py /var/www/gisquick/gunicorn_conf.py
COPY ./docker/django/supervisord.conf /etc/supervisor/conf.d/supervisord.conf


EXPOSE 8000

CMD ["supervisord", "-c", "/etc/supervisor/conf.d/supervisord.conf"]
