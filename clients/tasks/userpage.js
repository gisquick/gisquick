var gulp = require('gulp');
var concat = require('gulp-concat');


var TARGET = '../server/webgis/viewer/static/';


/**
 * Build JavaScript (with compiled templates) file
 */
gulp.task('js', function() {
  var series = require('stream-series');
  var uglify = require('gulp-uglify');
  var ngAnnotate = require('gulp-ng-annotate');
  var templateCache = require('gulp-angular-templatecache/');

  var gulpif = require('gulp-if');
  return series(
    // library dependencies
    gulp.src([
      'node_modules/gislab-web/node_modules/angular/angular.min.js',
      'node_modules/gislab-web/node_modules/angular-animate/angular-animate.min.js',
      'node_modules/gislab-web/node_modules/angular-aria/angular-aria.min.js',
      'node_modules/gislab-web/node_modules/angular-material/angular-material.gislab.js',
      'node_modules/gislab-web/node_modules/simple-scrollbar/simple-scrollbar.js'
      ])
      .pipe(
        gulpif(
          function (file) {
            return !file.path.endsWith("min.js")
          },
          uglify()
        )
      ),
      // source files
      gulp.src([
        'src/core/polyfills/**/*.js',
        'src/core/network/**/*.module.js',
        'src/core/utils/**/*.module.js',
        'src/core/ui/**/*.module.js',
        'src/web/userpage/js/**/*.module.js',
        'src/core/network/**/*.js',
        'src/core/utils/**/*.js',
        'src/core/ui/**/*.js',
        'src/web/userpage/js/**/*.js'
      ])
        .pipe(ngAnnotate({ add: true }))
        .pipe(uglify()),
      // tempaltes
      gulp.src('src/web/userpage/**/*.html')
        .pipe(templateCache())
  )
    .pipe(concat('userpage.min.js'))
    .pipe(gulp.dest(TARGET + 'js/'));
});


/**
 * Minify all css files
 */

gulp.task('csss', function() {
  var minifyCss = require('gulp-minify-css');
  var series = require('stream-series');

  return gulp
    .src([
      'node_modules/gislab-web/node_modules/angular-material/angular-material.css',
      'node_modules/gislab-web/node_modules/simple-scrollbar/simple-scrollbar.css',
      'src/web/styles/common.css',
      'src/web/styles/login.css',
      'src/web/styles/table.css',
      'src/web/userpage/styles/ui.css'
    ]).pipe(minifyCss())
      .pipe(concat('userpage.min.css'))
      .pipe(gulp.dest(TARGET + 'styles'));
});


/**
 * Build complete web application
 */
gulp.task('build', ['js', 'csss']);


/**
 * Serve web application with JavaScript server
 */
gulp.task('serve', function() {
  var Server = require('./dev-server.js');
  Server.Config = {
    port: 8200,
    root: [
      '.',
      'web/userpage',
      'src/',
      'src/web/userpage/',
      'node_modules/gislab-web/'
    ],
    src: [
      'src/core/**/*.js',
      'src/web/userpage/**/*.js',
      'src/web/userpage/**/*.html',
      'web/userpage/index.html'
    ],
    css: [
      'src/web/styles/**/*.css',
      'src/web/userpage/styles/**/*.css'
    ]
  };
  gulp.start('serve');
});
