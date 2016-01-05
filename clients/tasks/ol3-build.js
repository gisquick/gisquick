var gulp = require('gulp');
var rimraf = require('gulp-rimraf');
var gulpif = require('gulp-if');
var uglify = require('gulp-uglify');
var concat = require('gulp-concat');


var OL3DEPS = [
  'node_modules/crypto-js/core.js',
  'node_modules/crypto-js/md5.js',
  'node_modules/proj4/dist/proj4.js'
];


/**
 * Clean info.json
 */
gulp.task('clean-ol3', function() {
  return gulp.src('node_modules/openlayers/build/info.json', { read: false })
    .pipe(rimraf());
});


/**
 * copy our source files to openlayer3
 */
gulp.task('copyol3-src', ['clean-ol3'], function() {
  var merge = require('merge-stream');
  return merge(
    gulp.src('src/ol3/webgis/**/*.js')
      .pipe(gulp.dest('node_modules/openlayers/src/ol/webgis')),
    gulp.src('src/ol3/externs/webgis.js')
      .pipe(gulp.dest('node_modules/openlayers/externs/'))
  );
});

/**
 * Build OpenLayers 3 lib with GIS.lab extensions
 */
gulp.task('compile-ol3', ['copyol3-src'], function(cb) {
  var fs = require('fs');
  var config = require('../src/ol3/webgis.json');
  var main = require('../node_modules/openlayers/tasks/build.js');
  function writeOutput(err, output) {
    fs.writeFile('node_modules/openlayers/build/ol.min.js', output, cb);
  }
  main(config, writeOutput);
});


/**
 * Build OpenLayers 3 with GIS.lab extensions in debug mode
 */
gulp.task('compile-ol3-debug', ['copyol3-src'], function(cb) {
  var fs = require('fs');
  var config = require('../src/ol3/webgis-debug.json');
  var main = require('../node_modules/openlayers/tasks/build.js');
  function writeOutput(err, output) {
    fs.writeFile('node_modules/openlayers/build/ol.debug.js', output, cb);
  }
  main(config, writeOutput);
});


/**
 * Build minified OpenLayers 3 with dependencies
 */
gulp.task('build-ol3', ['compile-ol3'], function() {

  return gulp
    .src(OL3DEPS.concat(['node_modules/openlayers/build/ol.min.js']))
    .pipe(
      gulpif(
        function(file) {
          return !file.path.endsWith('ol.min.js')
        },
        uglify()
      )
    )
    .pipe(concat('ol3-deps.min.js'))
    .pipe(gulp.dest('node_modules/openlayers/build/'));
});


/**
 * Build debug version of OpenLayers 3 with dependencies
 */
gulp.task('build-ol3-debug', ['compile-ol3-debug'], function() {

  // copy openlayers
  return gulp.src(OL3DEPS.concat(['node_modules/openlayers/build/ol.debug.js']))
    .pipe(concat('ol3-deps.debug.js'))
    .pipe(gulp.dest('node_modules/openlayers/build/'));
});