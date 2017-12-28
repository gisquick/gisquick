#!/bin/sh

mkdir -p server

cp ../../server/requirements.txt server/
cp ../../server/requirements-dev.txt server/
cp -r ../../server/webgis/conf server/

docker build -t gisquick/django-dev .

rm -r server
