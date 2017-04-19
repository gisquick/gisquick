FROM nginx


RUN rm /etc/nginx/conf.d/default.conf
COPY gisquick.conf /etc/nginx/conf.d/
COPY proxy-parameters /etc/nginx/
COPY ssl-parameters /etc/nginx/


VOLUME /var/www/gisquick/static/
VOLUME /var/www/gisquick/media/
VOLUME /etc/nginx/ssl/
VOLUME /var/www/certbot/


EXPOSE 80 443