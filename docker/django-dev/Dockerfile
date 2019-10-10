FROM ubuntu:18.04


# Install system packages
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3-setuptools \
    python3-pip \
    python3-owslib \
    supervisor \
    sqlite3 \
    curl \
    nano \
    && rm -rf /var/lib/apt/lists/*


# Install Server dependencies
COPY server/requirements.txt /tmp/requirements.txt
COPY server/requirements-dev.txt /tmp/requirements-dev.txt
RUN pip3 install --no-cache-dir -r /tmp/requirements.txt && \
    pip3 install --no-cache-dir -r /tmp/requirements-dev.txt && \
    rm -r /tmp/*


# Create Gisquick Django project
COPY server/webgis/conf /tmp/conf
RUN mkdir -p /var/www/gisquick && \
    mkdir -p /var/log/django/ && \
    mkdir -p /var/log/gunicorn/ && \
    django-admin startproject --template=/tmp/conf/project_template/ djproject /var/www/gisquick/

COPY docker/django-dev/settings_custom.py /var/www/gisquick/djproject/settings_custom.py

ENV PYTHONPATH $PYTHONPATH:/var/www/gisquick/
ENV DJANGO_SETTINGS_MODULE djproject.settings
ENV LANG C.UTF-8


# Configure Supervisor
COPY docker/django-dev/supervisord.conf /etc/supervisor/conf.d/supervisord.conf


VOLUME /var/www/gisquick/static/
VOLUME /var/www/gisquick/media/
VOLUME /var/www/gisquick/data/
VOLUME /var/www/gisquick/webgis/
EXPOSE 8000

CMD ["/usr/bin/supervisord", "-c", "/etc/supervisor/conf.d/supervisord.conf"]
