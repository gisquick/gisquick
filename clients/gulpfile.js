/**
 * Gulp build system for GIS.lab web client
 * TODO:
 * 1 - separate to more files
 * 2 - replace jslint with jshint
 * 3 - add fixmyjs
 */

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
var series = require('stream-series');
var svgmin = require('gulp-svgmin');
var svgng = require('gulp-svg-ngmaterial');
var cheerio = require('gulp-cheerio');
var path = require('path');
var connect = require('gulp-connect');


var TARGET = '../server/webgis/viewer/static/';

var CSSS = [
  'node_modules/openlayers/dist/ol.css',
  'node_modules/gislab-web/node_modules/angular-material/angular-material.css',
  'node_modules/gislab-web/node_modules/angular-ui-layout/src/ui-layout.css',
  'node_modules/gislab-web/node_modules/angular-material-data-table/dist/md-data-table.css',
  'src/web/styles/ui.css'
];

var WEB_TEMPLATES = [
  'src/web/**/*.html'
];

var CORE_WEB_LIBS = [
  'src/core/**/*.module.js',
  'src/web/**/*.module.js',
  'src/core/**/*.js',
  'src/web/**/*.js'
];


var DEPS = [
  'node_modules/gislab-web/node_modules/angular/angular.min.js',
  'node_modules/gislab-web/node_modules/angular-animate/angular-animate.min.js',
  'node_modules/gislab-web/node_modules/angular-aria/angular-aria.min.js',
  'node_modules/gislab-web/node_modules/angular-material/angular-material.min.js',
  'node_modules/gislab-web/node_modules/angular-material-data-table/dist/md-data-table.min.js',
  'node_modules/gislab-web/node_modules/angular-ui-layout/dist/ui-layout.min.js'
];

var OL3DEPS = [
  'node_modules/crypto-js/core.js',
  'node_modules/crypto-js/md5.js',
  'node_modules/proj4/dist/proj4.js',
  'node_modules/openlayers/build/ol.min.js'
];

/**
 * Run streaming-integration. Every file you save fill be compiled immedietly
 * NOTE: linter is commented out
 */
gulp.task('stream', ['uglify', 'lint'], function() {

  gulp.watch(CORE_WEB_LIBS, ['lint', 'uglify']);

});


/**
 * compile all source code to one file
 */
gulp.task('uglify', function() {
  series(
    gulp.src(CORE_WEB_LIBS)
      .pipe(ngAnnotate({ add: true })),
    gulp.src(WEB_TEMPLATES)
      .pipe(templateCache())
  ).pipe(uglify())
    .pipe(concat('app.min.js'))
    .pipe(gulp.dest(TARGET + 'js/'));
});

/**
 * Minify all css files
 */
gulp.task('csss', function() {
  gulp.src(CSSS)
    .pipe(minifyCss())
    .pipe(concat('styles.min.css'))
    .pipe(gulp.dest(TARGET + 'styles'));

  gulp.src('src/web/styles/*.svg')
    .pipe(gulp.dest(TARGET + 'styles'));
});


/**
 * Compile OpenLayers with custom code
 */
gulp.task('deps', ['buildol3', 'buildol3-debug'], function() {

  // copy DEPS
  gulp.src(DEPS)
  .pipe(concat('deps.min.js'))
  .pipe(gulp.dest(TARGET + 'js/'));

  // copy openlayers
  gulp.src(OL3DEPS)
  .pipe(uglify())
  .pipe(concat('ol3-deps.min.js'))
  .pipe(gulp.dest(TARGET + 'js/'));


});


///**
// * Fix javascript style
// * this really needs to be fixed!
// */
//gulp.task('fixstyle', function() {
//  gulp.src('src/**/*.js')
//    .pipe(fixmyjs({ }))
//    .pipe(gulp.dest('src'));
//});


/**
 * JavaScript linter
 */
gulp.task('lint', function() {

  gulp.src('src/**/*.js')
    .pipe(jshint({
    }))
    .pipe(jshint.reporter(stylish));
});


/**
 * clena info.son
 */
gulp.task('cleanol3', function() {
  gulp.src('node_modules/openlayers/build/info.json', {read: false})
        .pipe(clean());
});


/**
 * copy our source files to openlayer3
 */
gulp.task('copyol3-src', ['cleanol3'], function() {
  gulp.src('src/ol3/webgis.json')
    .pipe(gulp.dest('node_modules/openlayers/build/'));

  gulp.src('src/ol3/webgis-debug.json')
    .pipe(gulp.dest('node_modules/openlayers/build/'));

  gulp.src('src/ol3/webgis/**/*.js')
    .pipe(gulp.dest('node_modules/openlayers/src/ol/webgis'));

  gulp.src('src/ol3/externs/webgis.js')
    .pipe(gulp.dest('node_modules/openlayers/externs/'));

});


/**
 * build ol3 app
 */
gulp.task('buildol3', ['copyol3-src'],
  shell.task(['cd node_modules/openlayers;' +
              'node tasks/build.js build/webgis.json build/ol.min.js'])
);


/**
 * build ol3 in debug mode
 */
gulp.task('buildol3-debug', ['copyol3-src'],
  shell.task(['cd node_modules/openlayers;' +
              'node tasks/build.js build/webgis-debug.json build/ol.debug.js'])
);


/**
 * default task
 * build deps, minify css, uglify
 */
gulp.task('default', ['deps', 'csss', 'uglify'], function() {

});

/**
 * Create SVG sprite file from separated files (compatibile with Angular Material library)
 */
gulp.task('web-icons', function () {
  return gulp
    .src('icons/*.svg')
    .pipe(svgmin())
    .pipe(cheerio({
      run: function ($) {
        $('[fill]').removeAttr('fill');
      },
      parserOptions: { xmlMode: true }
    }))
    .pipe(svgng({ filename : "icons.svg"}))
    .pipe(gulp.dest('src/web/styles/'));
    //.pipe(gzip({append: true,gzipOptions: { level: 9 }}))
    //.pipe(gulp.dest('src/web/styles/'));
});


/*********************************
 ***** Tasks for development *****
 *********************************/

/**
 * Starts development server
 */
gulp.task('devserver', function() {
  connect.server({
    root: ['.', 'web/', 'src/web/', 'src/', 'node_modules/gislab-web/'],
    port: 8100,
    livereload: true
  });
});

/**
 * Tasks for reloading of development server when source files change
 */
gulp.task('dev-js', function () {
  gulp.src(CORE_WEB_LIBS)
    .pipe(connect.reload());
});

gulp.task('dev-styles', function () {
  gulp.src('src/web/styles/*.css')
    .pipe(connect.reload());
});

gulp.task('dev-templates', function () {
  gulp.src(WEB_TEMPLATES)
    .pipe(connect.reload());
});

gulp.task('dev-index', function () {
  gulp.src('web/index.html')
    .pipe(connect.reload());
});

/**
 * Detects changes in source files and triggers reload of development server
 */
gulp.task('watch', function () {
  gulp.watch(CORE_WEB_LIBS, ['dev-js']);
  gulp.watch(WEB_TEMPLATES, ['dev-templates']);
  gulp.watch(['src/web/styles/*.css'], ['dev-styles']);
  gulp.watch(['web/index.html'], ['dev-index']);
});

/**
 * Start development server on http://localhost:8100 with live reloading
 */
gulp.task('dev', ['devserver', 'watch']);

// With livereload chrome extension
// var livereload = require('gulp-livereload');
// gulp.task('styles', function () {
//   gulp.src('src/web/styles/*.css')
//     .pipe(livereload());
// });

// gulp.task('watch', function () {
//   livereload.listen();
//   gulp.watch(['src/web/styles/*.css'], ['styles']);
//   gulp.watch(['src/web/**/*.js'], ['web-js']);
//   gulp.watch(['src/core/*.js'], ['core-js']);
//   gulp.watch(['index.html'], ['web-html']);
// });