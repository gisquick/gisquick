Start development docker containers service
``` bash
docker-compose -f docker-compose-dev.yml up
```

Create superuser
``` bash
docker-compose -f docker-compose-dev.yml exec django django-admin createsuperuser
```

# Simple gisquick web client written in [Vue.js](https://vuejs.org/)

Install [Node.js](https://nodejs.org/) (we recommend to use [nvm](https://github.com/creationix/nvm))

## Build Setup

``` bash
# install dependencies
npm install

# serve with hot reload at localhost:8080
npm run dev

# build for production with minification
npm run build

# build for production and view the bundle analyzer report
npm run build --report
```

For a detailed explanation on how things work, check out the [guide](http://vuejs-templates.github.io/webpack/) and [docs for vue-loader](http://vuejs.github.io/vue-loader).
