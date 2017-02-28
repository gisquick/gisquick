var gulp = require('gulp');
var concat = require('gulp-concat');
var merge = require('merge-stream');

var TARGET = './mobile/cordova-app/www/';


/**
 * Compile all JavaScript source code files into single minified file
 */
gulp.task('uglify', function() {
  var uglify = require('gulp-uglify');
  var ngAnnotate = require('gulp-ng-annotate');

  return gulp.src([
    'src/core/**/*.module.js',
    'src/web/map/js/**/*.module.js',
    'src/mobile/js/**/*.module.js',
    'src/core/**/*.js',
    'src/web/map/js/**/*.js',
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
  return gulp.src([
      'src/web/map/templates/**/*.html',
      'src/mobile/templates/**/*.html'
    ])
    .pipe(gulp.dest(TARGET + 'templates/'));
});


/**
 * Minify all css files and copy compiled svg image
 * into the target styles directory
 */
gulp.task('csss', function() {
  var minifyCss = require('gulp-minify-css');

  return merge(
    gulp.src([
      'node_modules/openlayers/dist/ol.css',
      'node_modules/gislab-web/node_modules/angular-material/angular-material.css',
      'src/web/styles/*.css',
      'src/web/map/styles/ui.css', // load ui first
      'src/web/map/styles/**/*.css',
      'src/mobile/styles/**/*.css'
    ])
      .pipe(minifyCss())
      .pipe(concat('styles.min.css'))
      .pipe(gulp.dest(TARGET + 'styles')),

    gulp.src('src/web/styles/*.svg')
      .pipe(gulp.dest(TARGET + 'styles')),

    gulp.src('src/web/map/styles/*.png')
      .pipe(gulp.dest(TARGET + 'styles/')),

    gulp.src('src/web/styles/fonts/*')
      .pipe(gulp.dest(TARGET + 'styles/fonts'))

  );
});


/**
 * Build all JavaScript libraries into single minified file
 */
// gulp.task('deps', ['build-ol3'], function() {
gulp.task('deps', function() {
  var uglify = require('gulp-uglify');
  var gulpif = require('gulp-if');

  return merge(
    // copy compiled ol3+deps
    // gulp.src('node_modules/openlayers/build/ol3-deps.min.js')
    gulp.src('node_modules/openlayers/build/ol3-deps.debug.js')
      .pipe(concat('ol3-deps.min.js'))
      .pipe(gulp.dest(TARGET + 'js/')),

    gulp.src([
      'node_modules/gislab-web/node_modules/angular/angular.min.js',
      'node_modules/gislab-web/node_modules/angular-animate/angular-animate.min.js',
      'node_modules/gislab-web/node_modules/angular-aria/angular-aria.min.js',
      'node_modules/gislab-web/node_modules/angular-material/angular-material.gislab.js',
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
      .pipe(gulp.dest(TARGET + 'js/'))
  );
});


/**
 * Copy index.html file into target directory
 */
gulp.task('index-page', function() {
  return gulp.src('mobile/cordova-index.html')
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
      'mobile/dev/',
      'src/mobile/',
      'src/',
      'src/web/map/',
      'node_modules/gislab-web/',
      'node_modules/gislab-mobile/'
    ],
    src: [
      'src/core/**/*.js',
      'src/web/map/**/*.js',
      'src/web/map/**/*.html',
      'src/mobile/js/**/*.js',
      'src/mobile/templates/**/*.html',
      'src/mobile/index.html'
    ],
    css: [
      'src/web/styles/**/*.css',
      'src/web/map/styles/**/*.css',
      'src/mobile/styles/*.css'
    ]
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