var gulp = require('gulp');
var concat = require('gulp-concat');


var TARGET = './mobile/cordova-app/www/';


/**
 * Compile all JavaScript source code files into single minified file
 */
gulp.task('uglify', function() {
  var uglify = require('gulp-uglify');
  var ngAnnotate = require('gulp-ng-annotate');

  gulp.src([
    'src/core/**/*.module.js',
    'src/mobile/js/**/*.module.js',
    'src/core/**/*.js',
    'src/mobile/js/**/*.js'
  ])
    .pipe(ngAnnotate({ add: true }))
    .pipe(uglify())
    .pipe(concat('app.min.js'))
    .pipe(gulp.dest(TARGET + 'js/'));
});


/**
 * Copy html templates into target directory
 */
gulp.task('templates', function() {
  gulp.src('src/mobile/templates/**/*.html')
    .pipe(gulp.dest(TARGET + 'templates/'));
});


/**
 * Minify all css files and copy compiled svg image
 * into the target styles directory
 */
gulp.task('csss', function() {
  var minifyCss = require('gulp-minify-css');

  gulp.src([
    'node_modules/openlayers/dist/ol.css',
    'node_modules/gislab-mobile/node_modules/onsenui/css/onsenui.css',
    'node_modules/gislab-mobile/node_modules/onsenui/css/onsen-css-components.css',
    'src/mobile/styles/**/*.css'
  ])
    .pipe(minifyCss())
    .pipe(concat('styles.min.css'))
    .pipe(gulp.dest(TARGET + 'styles'));

  gulp.src('src/mobile/styles/*.svg')
    .pipe(gulp.dest(TARGET + 'styles'));
});


/**
 * Build all JavaScript libraries into single minified file
 */
gulp.task('deps', ['build-ol3'], function() {
  var uglify = require('gulp-uglify');
  var gulpif = require('gulp-if');

  gulp.src([
    'node_modules/crypto-js/core.js',
    'node_modules/crypto-js/md5.js',
    'node_modules/proj4/dist/proj4.js',
    'node_modules/openlayers/build/ol.min.js',

    'node_modules/gislab-mobile/node_modules/angular/angular.min.js',
    'node_modules/gislab-mobile/node_modules/angular-animate/angular-animate.min.js',
    'node_modules/gislab-mobile/node_modules/onsenui/js/onsenui.min.js',
    'node_modules/gislab-mobile/node_modules/onsenui/js/angular-onsenui.min.js',
    'node_modules/gislab-mobile/node_modules/ngstorage/ngStorage.min.js'
  ])
    .pipe(
      gulpif(
        function (file) {
          return !file.path.endsWith("min.js")
        },
        uglify()
      )
    )
    .pipe(concat('deps.min.js'))
    .pipe(gulp.dest(TARGET + 'js/'));
});


/**
 * Copy index.html file into target directory
 */
gulp.task('index-page', function() {
  gulp.src('src/mobile/index.html')
    .pipe(concat('index.html'))
    .pipe(gulp.dest(TARGET));
});


/**
 *  Serve mobile application with JavaScript server
 */
gulp.task('serve', function() {
  var Server = require('./dev-server.js');
  Server.Config = {
    port: 8200,
    root: [
      '.',
      'src/',
      'src/mobile/',
      'mobile/dev',
      'node_modules/gislab-mobile/'
    ],
    src: [
      'src/core/**/*.js',
      'src/mobile/**/*.js',
      'src/mobile/**/*.html',
      'mobile/dev/index.html'
    ],
    css: 'src/mobile/styles/**/*.css'
  };
  gulp.start('serve');
});


/**
 * Create SVG sprite file from separated files
 */
gulp.task('icons', function() {
  var svgmin = require('gulp-svgmin');
  var svgstore = require('gulp-svgstore');
  var path = require('path');

  return gulp
    .src('icons/*.svg')
    .pipe(svgmin(function (file) {
      var prefix = path.basename(file.relative, path.extname(file.relative));
      return {
        plugins: [{
          cleanupIDs: {
            prefix: prefix + '-',
            minify: false
          }
        }]
      }
    }))
    .pipe(svgstore())
    .pipe(gulp.dest('src/mobile/styles/'));
});


/**
 * Create Cordova hybrid mobile application project
 */
gulp.task('build', ['index-page', 'uglify', 'templates', 'csss', 'deps']);