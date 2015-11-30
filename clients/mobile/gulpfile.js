
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


var svgstore = require('gulp-svgstore');
var svgmin = require('gulp-svgmin');
var path = require('path');

gulp.task('mobile-icons', function () {
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


var DEV_JS = ['../src/mobile/js/**/*.js', '../src/core/**/*.js'];
var DEV_HTML = '../src/mobile/**/*.html';
var DEV_CSS = '../src/mobile/styles/**/*.css';
/**
 * Tasks for development
 */
var connect = require('gulp-connect');

gulp.task('devserver', function() {
  connect.server({
    root: ['../', '../src/', '../src/mobile/', '../node_modules/gislab-mobile/'],
    port: 8200,
    livereload: true
  });
});

gulp.task('dev-js', function () {
  gulp.src(DEV_JS)
    .pipe(connect.reload());
});

gulp.task('dev-styles', function () {
  gulp.src(DEV_CSS)
    .pipe(connect.reload());
});

gulp.task('dev-templates', function () {
  gulp.src(DEV_HTML)
    .pipe(connect.reload());
});

gulp.task('dev-index', function () {
  gulp.src('../src/mobile/index.html')
    .pipe(connect.reload());
});

gulp.task('watch', function () {
  gulp.watch(DEV_JS, ['dev-js']);
  gulp.watch(DEV_HTML, ['dev-templates']);
  gulp.watch(DEV_CSS, ['dev-styles']);
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