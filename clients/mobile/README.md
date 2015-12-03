Before you start building mobile client, it is necessary to have builded web 
client or OpenLayers3 with Webgis extension (from 'gislab-web-mobile/clients'
run `$ gulp` or `$ gulp buildol3 buildol3-debug`).

## Develop application in browser

Start development server (run in 'gislab-web-mobile/clients/mobile')
```bash
$ gulp dev
```

Open application in web browser https://localhost:8200


## Build Android application

### Install dependencies

```bash
$ sudo apt-get install openjdk-7-jdk ant
$ npm install -g cordova
```

### Download and install Android SDK (preferably into the '/opt/' directory)

```bash
wget http://dl.google.com/android/android-sdk_r24.4.1-linux.tgz
tar zxvf android-sdk_r24.4.1-linux.tgz
```

Add Android SDK configuration into ~/.bashrc file

```bash
export ANDROID_HOME=/opt/android-sdk-linux
export PATH=${PATH}:/opt/android-sdk-linux/tools:/opt/android-sdk-linux/platform-tools
```

Apply changes in .bashrc file

```bash
$ . ~/.bashrc
```

Install required SDK packages

```bash
$ android update sdk --no-ui --all --filter platform-tools,build-tools-22.0.1,android-22
```

### Configure Cordova project

Setup Android platform for Cordova project (run in 'gislab-web-mobile/clients/mobile/cordova-app')

```bash
$ cordova platform add android
$ cordova plugin add "cordova-plugin-device"
$ cordova plugin add "cordova-plugin-splashscreen"
$ cordova plugin add "cordova-plugin-geolocation@0.3.6"
$ cordova plugin add "cordova-plugin-inappbrowser"
```


### Build Android application (debug version)

Build mobile client application into Cordova project and build Android (hybrid) native application (run in 'gislab-web-mobile/clients/mobile/cordova-app')

```bash
$ gulp build
$ ANDROID_BUILD=ant cordova build android
```

### Install application into the device

```bash
$ adb install -r platforms/android/bin/MainActivity-debug.apk
```