## Server setup for development

Note: Commands in this section are meant to run from root directory

### Prepare server data
```
mkdir docker/_data
mkdir docker/_data/data
mkdir docker/_data/media
mkdir docker/_data/publish
```
Copy Gisquick projects into ```docker/_data/publish/```

### Start server in development mode
```
docker-compose -f docker/docker-compose-dev.yml up
```

### Create superuser
When docker container of the server is running, execute:
```
docker-compose -f docker/docker-compose-dev.yml exec django django-admin createsuperuser
```
You can create regular users from admin interface running on http://localhost:8000/admin


Once you have django server configured, you can use docker-compose command to start/stop server service
```
docker-compose -f docker/docker-compose-dev.yml up|down|start|stop
```

## Project setup
```
npm install
```

### Compiles and hot-reloads for development
```
npm run serve
```

### Compiles and minifies for production
```
npm run build
```


### Lints and fixes files
```
npm run lint
```

### Customize configuration
See [Configuration Reference](https://cli.vuejs.org/config/).


### Translations:

1. Scan and extract translations from source files:
```
npm run makemessages
```

2. Update translations (lang/[lang-code].po), e.g. open .po file in Poedit and select Catalog -> Update from POT file... -> select lang/messages.pot file

3. Compile translations into JSON
```
npm run translations
```

### Build selected components as library module
Single component
```
CSS_EXTRACT=False npm run build -- --target lib --dest dist/ --name infopanel src/extensions/Districts.vue
```

Multiple components
```
CSS_EXTRACT=False npm run build -- --target lib --dest dist/ --name infopanel src/extensions/index.js
```

#### index.js
```javascript
import component1 from './Component1'
import component2 from './Component2'

export default {
  component1,
  component2
}
```