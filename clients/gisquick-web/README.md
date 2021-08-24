## Docker build
```
docker build -t gisquick/web-map .
```

## Setup for development

In order to start development server, it is required to setup and run local Gisquick deployment.
Default configuration expects Gisquick server to be running on http://localhost (port 80).
For different setup you will have to update proxy server configuration in ```vue.config.js``` file.
See [Configuration Reference](https://cli.vuejs.org/config/).

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


### Translations:

1. Scan and extract translations from source files:
```
npm run makemessages
```

2. Update translations (i18n/[locale-code].po), e.g. open .po file in Poedit and select Catalog -> Update from POT file... -> select i18n/messages.pot file

3. Compile translations into JSON fromat
```
npm run compilemessages
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
