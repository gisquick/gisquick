FROM nginx


RUN rm /etc/nginx/conf.d/default.conf

COPY gisquick.template /etc/nginx/conf.d/
COPY proxy-parameters /etc/nginx/
COPY ssl-parameters /etc/nginx/

ENV NGINX_HOST projects.gisquick.org

VOLUME /var/www/gisquick/static/
VOLUME /var/www/gisquick/media/
VOLUME /etc/nginx/ssl/
VOLUME /var/www/certbot/


EXPOSE 80 443


CMD ["/bin/sh","-c", "envsubst '$NGINX_HOST' < /etc/nginx/conf.d/gisquick.template > /etc/nginx/conf.d/gisquick.conf && nginx -g 'daemon off;'"]