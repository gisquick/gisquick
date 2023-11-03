FROM node:16-alpine AS webapp
WORKDIR /gisquick-web/
COPY package*.json ./
RUN npm install
COPY . .
ARG MODE
ENV VITE_VUE_APP_MODE=$MODE
RUN npm run compilemessages
RUN npm run build


FROM alpine:latest
RUN apk add --no-cache rsync
COPY --from=webapp /gisquick-web/dist/ /var/www
CMD ["rsync", "-r", "--delete-after", "/var/www/", "/assets/map"]
