var gulp = require('gulp');
var concat = require('gulp-concat');


var TARGET = '../server/webgis/viewer/static/';


/**
 * Compile all JavaScript and HTML templates files into single minified file
 */
gulp.task('uglify', function() {
  var series = require('stream-series');
  var uglify = require('gulp-uglify');
  var ngAnnotate = require('gulp-ng-annotate');
  var templateCache = require('gulp-angular-templatecache/');

  series(
    gulp.src([
      'src/core/**/*.module.js',
      'src/web/**/*.module.js',
      'src/core/**/*.js',
      'src/web/**/*.js'
    ]).pipe(ngAnnotate({ add: true })),
    gulp.src('src/web/**/*.html')
      .pipe(templateCache())
  )
    .pipe(uglify())
    .pipe(concat('app.min.js'))
    .pipe(gulp.dest(TARGET + 'js/'));
});


/**
 * Minify all css files
 */
gulp.task('csss', function() {
  var minifyCss = require('gulp-minify-css');

  gulp.src([
    'node_modules/openlayers/dist/ol.css',
    'node_modules/gislab-web/node_modules/angular-material/angular-material.css',
    'node_modules/gislab-web/node_modules/angular-ui-layout/src/ui-layout.css',
    'node_modules/gislab-web/node_modules/angular-material-data-table/dist/md-data-table.css',
    'src/web/styles/map/**/*.css'
  ])
    .pipe(minifyCss())
    .pipe(concat('map.min.css'))
    .pipe(gulp.dest(TARGET + 'styles'));

  gulp.src('src/web/styles/map/*.svg')
    .pipe(gulp.dest(TARGET + 'styles'));

  gulp.src([
    'node_modules/gislab-web/node_modules/angular-material/angular-material.css',
    'src/web/styles/login/**/*.css'
  ])
    .pipe(minifyCss())
    .pipe(concat('login.min.css'))
    .pipe(gulp.dest(TARGET + 'styles'));
});


/**
 * Build library dependencies
 */
gulp.task('deps', ['build-ol3'], function() {

  // copy compiled ol3+deps
  gulp.src('node_modules/openlayers/build/ol3-deps.min.js')
    .pipe(concat('ol3-deps.min.js'))
    .pipe(gulp.dest(TARGET + 'js/'));

  // copy DEPS
  gulp.src([
    'node_modules/gislab-web/node_modules/angular/angular.min.js',
    'node_modules/gislab-web/node_modules/angular-animate/angular-animate.min.js',
    'node_modules/gislab-web/node_modules/angular-aria/angular-aria.min.js',
    'node_modules/gislab-web/node_modules/angular-material/angular-material.min.js',
    'node_modules/gislab-web/node_modules/angular-material-data-table/dist/md-data-table.min.js',
    'node_modules/gislab-web/node_modules/angular-ui-layout/dist/ui-layout.min.js'
  ])
    .pipe(concat('deps.min.js'))
    .pipe(gulp.dest(TARGET + 'js/'));
});


/**
 * Serve web application with JavaScript server
 */
gulp.task('serve', function() {
  var Server = require('./dev-server.js');
  Server.Config = {
    port: 8100,
    root: [
      '.',
      'web/',
      'src/',
      'src/web/',
      'node_modules/gislab-web/'
    ],
    src: [
      'src/core/**/*.js',
      'src/web/**/*.js',
      'src/web/**/*.html',
      'web/index.html'
    ],
    css: 'src/web/styles/*.css'
  };
  gulp.start('serve');
});


/**
 * Create SVG sprite file from separated files (compatibile with Angular Material library)
 */
gulp.task('icons', function() {
  var svgmin = require('gulp-svgmin');
  var svgng = require('gulp-svg-ngmaterial');
  var cheerio = require('gulp-cheerio');

  return gulp
    .src('icons/*.svg')
    .pipe(svgmin())
    .pipe(cheerio({
      run: function($) {
        $('[fill]').removeAttr('fill');
      },
      parserOptions: { xmlMode: true }
    }))
    .pipe(svgng({ filename : "icons.svg"}))
    .pipe(gulp.dest('src/web/styles/map/'));
    //.pipe(gzip({append: true,gzipOptions: { level: 9 }}))
    //.pipe(gulp.dest('src/web/styles/'));
});


/**
 * Build complete web application
 */
gulp.task('build', ['deps', 'csss', 'uglify']);