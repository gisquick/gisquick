## Docker build

### Standard web version
```
docker build -t gisquick/web-map .
```
### Progressive Web App
```
docker build --build-arg MODE=pwa -t gisquick/web-map:pwa .
```

## Setup for development

In order to start development server, it is required to setup and run local Gisquick deployment.
Default configuration expects Gisquick server to be running on http://localhost (port 80).
For different setup you will have to copy `.env.example` file and update environment variable.

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

### Update PWA icons
```
npm install -g vue-asset-generate
vue-asset-generate -a pwa-icon.svg -o public/map/icons --no-manifest
```


## Custom Info Panel

[Read more](https://github.com/gisquick/gisquick/blob/master/clients/gisquick-web/InfoPanel.md)
