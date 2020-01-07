FROM ubuntu:18.04

# Install system packages
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3-setuptools \
    python3-pip \
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


ENV PYTHONPATH $PYTHONPATH:/var/www/gisquick/
ENV DJANGO_SETTINGS_MODULE djproject.settings
ENV LANG C.UTF-8
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1


EXPOSE 8000

CMD ["django-admin", "runserver", "0.0.0.0:8000"]
