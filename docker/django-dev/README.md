Special version of django server image for running server in development mode - in debug mode and by django-admin runserver with mounted source files

## Build Docker image

From root directory:
```
docker build -f docker/django-dev/Dockerfile -t gisquick/django-dev:vue --build-arg version=dev .
```
