# multistage build requires at least docker-ce 17.06

FROM node:4.8.4-alpine
MAINTAINER Marcel Dancak "dancakm@gmail.com"

ARG version

# Install system packages
RUN apk update && apk add \
    bash \
    patch \
    git \
    openjdk8-jre \
    && rm -rf /var/cache/apk/*


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