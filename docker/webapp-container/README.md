Base image for static web applications served by file server.

### Requirements:
- all static files referenced from html file(s) should be in './static' directory and should be built with filename hashing
- it's recommended to pre-generate compressed (gzip) versions of static files

## Build Docker image
```
docker build -t gisquick/webapp-container .
```
