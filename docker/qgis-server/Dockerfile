ARG BASE_IMAGE=ubuntu:jammy

FROM ${BASE_IMAGE}

ARG REPO=ubuntu-ltr
ARG DISTRO=jammy

ENV LANGUAGE=en_EN
ENV LANG=en_EN.UTF-8
ENV LC_ALL=en_EN.UTF-8
ENV PYTHONIOENCODING UTF-8

RUN apt-get update \
    && apt-get install --no-install-recommends --no-install-suggests --allow-unauthenticated -y \
        gnupg \
        ca-certificates \
        wget \
        locales \
    && localedef -i en_US -f UTF-8 en_US.UTF-8 \
    # Add the current key for package downloading - As the key changes every year at least
    # Please refer to QGIS install documentation and replace it with the latest one
    && wget -O /etc/apt/keyrings/qgis-archive-keyring.gpg https://download.qgis.org/downloads/qgis-archive-keyring.gpg \
    # Add repository for latest version of qgis-server
    && printf "Types: deb deb-src\nURIs: http://qgis.org/${REPO}\nSuites: ${DISTRO}\nArchitectures: amd64\nComponents: main\nSigned-By: /etc/apt/keyrings/qgis-archive-keyring.gpg" >> /etc/apt/sources.list.d/qgis.sources \
    && apt-get update \
    && apt-get install --no-install-recommends --no-install-suggests --allow-unauthenticated -y \
        qgis-server \
        spawn-fcgi \
        xauth \
        xvfb \
    && apt-get remove --purge -y \
        gnupg \
        wget \
    && rm -rf /var/lib/apt/lists/*

RUN useradd -m qgis

ENV TINI_VERSION v0.19.0
ADD https://github.com/krallin/tini/releases/download/${TINI_VERSION}/tini /tini
RUN chmod +x /tini

ENV QGIS_PREFIX_PATH /usr
ENV QGIS_SERVER_LOG_STDERR 1
ENV QGIS_SERVER_LOG_LEVEL 2
# ENV QGIS_SERVER_LOG_FILE /var/log/lighttpd/qgis-mapserver.log
# ENV QGIS_PLUGINPATH /usr/lib/qgis/python/plugins

COPY cmd.sh /home/qgis/cmd.sh
RUN chmod 777 /home/qgis/cmd.sh
RUN chown qgis:qgis /home/qgis/cmd.sh

USER qgis
WORKDIR /home/qgis

ENTRYPOINT ["/tini", "--"]

CMD ["/home/qgis/cmd.sh"]
