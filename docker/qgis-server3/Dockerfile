FROM ubuntu:18.04

# Download public keys for qgis and ubuntugis repositories
RUN apt-get update && apt-get install -y --no-install-recommends gnupg
RUN apt-key adv --keyserver keyserver.ubuntu.com --recv-key 51F523511C7028C3 && \
    apt-key adv --keyserver keyserver.ubuntu.com --recv-key 089EBE08314DF160

# Add qgis and ubuntugis repositories
RUN sh -c "echo deb http://qgis.org/ubuntugis bionic main >> /etc/apt/sources.list" && \
    sh -c "echo deb-src http://qgis.org/ubuntugis bionic main >> /etc/apt/sources.list" && \
    sh -c "echo deb http://ppa.launchpad.net/ubuntugis/ubuntugis-unstable/ubuntu bionic main >> /etc/apt/sources.list"


# Install system packages
RUN apt-get -y update && apt-get install -y --no-install-recommends --allow-unauthenticated \
    qgis-server \
    supervisor \
    lighttpd \
    xvfb \
 && rm -rf /var/lib/apt/lists/*


# Configure Lighttpd server
COPY lighttpd.conf /etc/lighttpd/lighttpd.conf


# Configure Supervisor
COPY supervisord.conf /etc/supervisor/conf.d/supervisord.conf


VOLUME /publish/
EXPOSE 90


CMD ["/usr/bin/supervisord", "-c", "/etc/supervisor/conf.d/supervisord.conf"]
