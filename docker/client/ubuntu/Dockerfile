# multistage build requires at least docker-ce 17.06

FROM ubuntu:16.04 AS builder
MAINTAINER Marcel Dancak "dancakm@gmail.com"

ARG version

# Install system packages
RUN apt-get update && apt-get install -y --no-install-recommends \
    python-setuptools \
    python-pip \
    git \
    patch \
    openjdk-8-jre \
    curl \
    && rm -rf /var/lib/apt/lists/*


RUN curl -sL https://deb.nodesource.com/setup_4.x | bash -
RUN apt-get install -y nodejs


COPY ./clients/ /gisquick/clients/

WORKDIR /gisquick/clients/
RUN npm install && \
    npm install web && \
    npm install -g gulp

RUN gulp icons-web && \
    gulp build-ol3-debug

# VOLUME /gisquick/clients/src
EXPOSE 8100

CMD gulp serve-web