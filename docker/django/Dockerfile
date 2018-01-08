FROM ubuntu:16.04


# Install system packages
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3-setuptools \
    python3-pip \
    python3-owslib \
    supervisor \
    sqlite3 \
    && rm -rf /var/lib/apt/lists/*


# Install Gunicorn and GIS.lab Web dependencies
COPY tmp/requirements.txt /tmp/

RUN pip3 install --no-cache-dir 'gunicorn>=19.7,<19.8' && \
    pip3 install --no-cache-dir -r /tmp/requirements.txt

COPY tmp/gisquick-dev.tar.gz /tmp/

RUN pip3 install --no-cache-dir /tmp/gisquick-dev.tar.gz && \
    rm /tmp/gisquick-dev.tar.gz


# Create GisQuick Django project
RUN mkdir -p /var/www/gisquick && \
    mkdir -p /var/log/django/ && \
    mkdir -p /var/log/gunicorn/ && \
    django-admin startproject --template=/usr/local/lib/python3.5/dist-packages/webgis/conf/project_template/ djproject /var/www/gisquick/


COPY settings_custom.py /var/www/gisquick/djproject/

ENV PYTHONPATH $PYTHONPATH:/var/www/gisquick/
ENV DJANGO_SETTINGS_MODULE djproject.settings
ENV LANG C.UTF-8


# Configure Gunicorn and Supervisor
COPY gunicorn_conf.py /var/www/gisquick/gunicorn_conf.py
COPY supervisord.conf /etc/supervisor/conf.d/supervisord.conf


VOLUME /var/www/gisquick/static/
VOLUME /var/www/gisquick/media/
VOLUME /var/www/gisquick/data/
EXPOSE 8000

CMD ["/usr/bin/supervisord", "-c", "/etc/supervisor/conf.d/supervisord.conf"]
