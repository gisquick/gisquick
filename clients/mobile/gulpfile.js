
var gulp = require('gulp');
var shell = require('gulp-shell');
var clean = require('gulp-clean');
var jshint = require('gulp-jshint');
var fixmyjs = require('gulp-fixmyjs');
var stylish = require('jshint-stylish');
var ngAnnotate = require('gulp-ng-annotate');
var uglify = require('gulp-uglify');
var concat = require('gulp-concat');
var watch = require('gulp-watch');
var install = require('gulp-install');
var chug = require('gulp-chug');
var minifyCss = require('gulp-minify-css');
var templateCache = require('gulp-angular-templatecache');
var connect = require('gulp-connect');
var svgstore = require('gulp-svgstore');
var svgmin = require('gulp-svgmin');
var path = require('path');
var gulpif = require('gulp-if');


var JS = [
  '../src/core/**/*.module.js',
  '../src/mobile/js/**/*.module.js',
  '../src/core/**/*.js',
  '../src/mobile/js/**/*.js'
];

var TEMPLATES = '../src/mobile/templates/**/*.html';

var CSS = [
  '../node_modules/openlayers/dist/ol.css',
  '../node_modules/gislab-mobile/node_modules/onsenui/css/onsenui.css',
  '../node_modules/gislab-mobile/node_modules/onsenui/css/onsen-css-components.css',
  '../src/mobile/styles/**/*.css'
];

var DEPS_JS = [
  '../node_modules/crypto-js/core.js',
  '../node_modules/crypto-js/md5.js',
  '../node_modules/proj4/dist/proj4.js',
  '../node_modules/openlayers/build/ol.min.js',

  '../node_modules/gislab-mobile/node_modules/angular/angular.min.js',
  '../node_modules/gislab-mobile/node_modules/angular-animate/angular-animate.min.js',
  '../node_modules/gislab-mobile/node_modules/onsenui/js/onsenui.min.js',
  '../node_modules/gislab-mobile/node_modules/onsenui/js/angular-onsenui.min.js',
  '../node_modules/gislab-mobile/node_modules/ngstorage/ngStorage.min.js',
];

var TARGET = './cordova-app/www/';


/********************************
 **** Tasks for development *****
 ********************************/

/**
 * Starts development server
 */
gulp.task('devserver', function() {
  connect.server({
    root: ['../', '../src/', '../src/mobile/', '../node_modules/gislab-mobile/'],
    port: 8200,
    livereload: true,
    fallback: '../src/mobile/index-dev.html'
  });
});

/**
 * Tasks for reloading of development server when source files change
 */
gulp.task('dev-js', function () {
  gulp.src(JS)
    .pipe(connect.reload());
});

gulp.task('dev-styles', function () {
  gulp.src(CSS)
    .pipe(connect.reload());
});

gulp.task('dev-templates', function () {
  gulp.src(TEMPLATES)
    .pipe(connect.reload());
});

gulp.task('dev-index', function () {
  gulp.src('../src/mobile/index-dev.html')
    .pipe(connect.reload());
});

/**
 * Detects changes in source files and triggers reload of development server
 */
gulp.task('watch', function () {
  gulp.watch(JS, ['dev-js']);
  gulp.watch(TEMPLATES, ['dev-templates']);
  gulp.watch(CSS, ['dev-styles']);
  gulp.watch('../src/mobile/index-dev.html', ['dev-index']);
});

/**
 * Start development server on http://localhost:8100 with live reloading
 */
gulp.task('dev', ['devserver', 'watch']);


/*************************************************
 **** Tasks for building Android application *****
 *************************************************/

/**
 * compile all JavaScript and Angular's HTML template source code to one file
 */
gulp.task('uglify', function() {
    gulp.src(JS)
      .pipe(ngAnnotate({ add: true }))
      .pipe(uglify())
      .pipe(concat('app.min.js'))
      .pipe(gulp.dest(TARGET + 'js/'));
});

/**
 * Copy html templates into target directory
 */
gulp.task('templates', function() {
   gulp.src(TEMPLATES)
    .pipe(gulp.dest(TARGET + 'templates/'));
});

/**
 * Minify all css files and move svg image files (already compiled
 * with 'build-svg' task)
 */
gulp.task('csss', function() {
  gulp.src(CSS)
    .pipe(minifyCss())
    .pipe(concat('styles.min.css'))
    .pipe(gulp.dest(TARGET + 'styles'));

  gulp.src('../src/mobile/styles/*.svg')
    .pipe(gulp.dest(TARGET + 'styles'));
});

/**
 * Build js libraries (except ol3) to single minified file
 */
gulp.task('deps', function() {
  var fname = 'core.js';
  gulp.src(DEPS_JS)
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
   gulp.src('../src/mobile/index-deploy.html')
    .pipe(concat('index.html'))
    .pipe(gulp.dest(TARGET));
});

gulp.task('build', ['index-page', 'uglify', 'templates', 'csss', 'deps']);


/**
 * Create SVG sprite file from separated files
 */
gulp.task('build-svg', function () {
  return gulp
    .src('../icons/*.svg')
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
    .pipe(gulp.dest('../src/mobile/styles/'));
});
