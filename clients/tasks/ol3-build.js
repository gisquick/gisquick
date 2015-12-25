var gulp = require('gulp');
var shell = require('gulp-shell');
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
 * clena info.son
 */
gulp.task('clean-ol3', function() {
  return gulp.src('node_modules/openlayers/build/info.json', { read: false })
    .pipe(rimraf());
});


/**
 * copy our source files to openlayer3
 */
gulp.task('copyol3-src', ['clean-ol3'], function() {
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
gulp.task('compile-ol3', ['copyol3-src'],
  shell.task(['cd node_modules/openlayers;' +
              'node tasks/build.js build/webgis.json build/ol.min.js'])
);


/**
 * build ol3 in debug mode
 */
gulp.task('compile-ol3-debug', ['copyol3-src'],
  shell.task(['cd node_modules/openlayers;' +
              'node tasks/build.js build/webgis-debug.json build/ol.debug.js'])
);

/**
 * Compile OpenLayers with custom code
 */
gulp.task('build-ol3', ['compile-ol3'], function() {

  // copy openlayers
  gulp.src(OL3DEPS.concat(['node_modules/openlayers/build/ol.min.js']))
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

gulp.task('build-ol3-debug', ['compile-ol3-debug'], function() {

  // copy openlayers
  gulp.src(OL3DEPS.concat(['node_modules/openlayers/build/ol.debug.js']))
    .pipe(concat('ol3-deps.debug.js'))
    .pipe(gulp.dest('node_modules/openlayers/build/'));

});