FROM ubuntu:18.04

ARG repo=ubuntu-ltr

# Download public keys for qgis repository
RUN apt-get update && apt-get install -y --no-install-recommends gnupg
RUN apt-key adv --keyserver keyserver.ubuntu.com --recv-key 51F523511C7028C3

# Add qgis and ubuntugis repositories
RUN sh -c "echo deb http://qgis.org/$repo bionic main >> /etc/apt/sources.list" && \
    sh -c "echo deb-src http://qgis.org/$repo bionic main >> /etc/apt/sources.list"

# Install system packages
RUN apt-get -y update && apt-get install -y --no-install-recommends \
    qgis-server \
    supervisor \
    lighttpd \
    xvfb \
 && rm -rf /var/lib/apt/lists/*


# Configure Lighttpd server
COPY lighttpd.conf /etc/lighttpd/lighttpd.conf


# Configure Supervisor
COPY supervisord.conf /etc/supervisor/conf.d/supervisord.conf


ENV DISPLAY :99
ENV HOME /home/www-data
ENV QGIS_PREFIX_PATH /usr
ENV QGIS_SERVER_PARALLEL_RENDERING true

RUN mkdir -p $HOME && chown www-data $HOME/


VOLUME /publish/
EXPOSE 90

CMD ["/usr/bin/supervisord", "-c", "/etc/supervisor/conf.d/supervisord.conf"]
