FROM node:14-alpine AS webapp

WORKDIR /gisquick-web/
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build -- --modern


FROM gisquick/webapp-container

COPY --from=webapp /gisquick-web/dist/ /var/www
CMD ["copy-assets", "/var/www", "/assets/map"]
