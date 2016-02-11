/**
 * Gulp build system for GIS.lab clients
 * TODO:
 *  - replace jslint with jshint
 */
var gulp = require('gulp');


/**
 * JavaScript linter
 */
gulp.task('lint', function() {
  var jshint = require('gulp-jshint');
  var stylish = require('jshint-stylish');

  gulp.src('src/**/*.js')
    .pipe(jshint({}))
    .pipe(jshint.reporter(stylish));
});

/**
 *  Build optimized OpenLayers3 library with GIS.lab
 *  extensions and dependencies
 */
gulp.task('build-ol3', function () {
  require('./tasks/ol3-build.js');
  gulp.start('build-ol3');
});

/**
 *  Build debug version of OpenLayers3 library
 *  with GIS.lab extensions and dependencies
 */
gulp.task('build-ol3-debug', function () {
  require('./tasks/ol3-build.js');
  gulp.start('build-ol3-debug');
});

/**
 *  Build web application as a part of GIS.lab Web server
 */
gulp.task('build-web', function() {
  require('./tasks/web.js');
  gulp.start('build');
});

/**
 *  Serve web application with JavaScript server.
 *  Requires debug version of OpenLayers 3 library
 *  to be already builded ('build-ol3-debug' task)
 */
gulp.task('serve-web', function() {
  require('./tasks/web.js');
  gulp.start('serve');
});

/**
 *  Build single icons file from source svg files.
 */
gulp.task('icons-web', function() {
  require('./tasks/web.js');
  gulp.start('icons');
});

/**
 *  Build mobile application as a Cordova hybrid app
 */
gulp.task('build-mobile', function() {
  require('./tasks/mobile.js');
  gulp.start('build');
});

/**
 *  Serve mobile application with JavaScript server.
 *  Requires debug version of OpenLayers 3 library
 *  to be already builded ('build-ol3-debug' task)
 */
gulp.task('serve-mobile', function() {
  require('./tasks/mobile.js');
  gulp.start('serve');
});

/**
 *  Build single icons file from source svg files.
 */
gulp.task('icons-mobile', function() {
  require('./tasks/mobile.js');
  gulp.start('icons');
});

/**
 * Default gulp task
 */
gulp.task('default', ['build-web', 'build-ol3-debug']);
