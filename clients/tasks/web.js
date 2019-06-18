var gulp = require('gulp');
var concat = require('gulp-concat');
var merge = require('merge-stream');
var uglify = require('gulp-uglify');


var TARGET = '../server/webgis/viewer/static/';


/**
 * Compile all JavaScript and HTML templates files into single minified file
 */
gulp.task('uglify', function() {
  var series = require('stream-series');
  var ngAnnotate = require('gulp-ng-annotate');
  var templateCache = require('gulp-angular-templatecache/');

  return series(
    gulp.src([
      'src/core/**/*.module.js',
      'src/web/map/**/*.module.js',
      'src/core/**/*.js',
      'src/web/map/**/*.js'
    ]).pipe(ngAnnotate({ add: true })),
    gulp.src('src/web/map/**/*.html')
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

  return merge(
    gulp.src([
      'ol3/ol.css',
      'node_modules/gislab-web/node_modules/angular-material/angular-material.css',
      'node_modules/gislab-web/node_modules/simple-scrollbar/simple-scrollbar.css',
      // 'src/simple-scrollbar/simple-scrollbar.css',
      'src/web/styles/*.css',
      'src/web/map/styles/ui.css', // load ui first
      'src/web/map/styles/**/*.css'
    ])
      .pipe(minifyCss())
      .pipe(concat('map.min.css'))
      .pipe(gulp.dest(TARGET + 'styles/')),

    gulp.src([
      'src/web/styles/*.svg',
      'src/web/styles/*.png',
      'src/web/map/styles/*.png'
    ])
      .pipe(gulp.dest(TARGET + 'styles')),

    gulp.src('src/web/styles/fonts/*')
      .pipe(gulp.dest(TARGET + 'styles/fonts'))
  );
});


/**
 * Build library dependencies
 */
 gulp.task('deps', function() {

  var gulpif = require('gulp-if');
  return merge(
    // copy compiled ol3+deps
    gulp.src('ol3/ol3-deps.min.js')
      .pipe(concat('ol3-deps.min.js'))
      .pipe(gulp.dest(TARGET + 'js/')),

    // copy DEPS
    gulp.src([
      'node_modules/gislab-web/node_modules/angular/angular.min.js',
      'node_modules/gislab-web/node_modules/angular-animate/angular-animate.min.js',
      'node_modules/gislab-web/node_modules/angular-aria/angular-aria.min.js',
      'node_modules/gislab-web/node_modules/angular-material/angular-material.gislab.js',
      'node_modules/gislab-web/node_modules/simple-scrollbar/simple-scrollbar.js',
      // 'src/simple-scrollbar/simple-scrollbar.js',
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
 * Serve web application with JavaScript server
 */
gulp.task('serve', function() {
  var Server = require('./dev-server.js');
  Server.Config = {
    port: 8100,
    root: [
      '.',
      'web/map/',
      'src/',
      'src/web/map/',
      'node_modules/gislab-web/'
    ],
    src: [
      'src/core/**/*.js',
      'src/web/map/**/*.js',
      'src/web/map/**/*.html',
      'web/map/index.html'
    ],
    css: [
      'src/web/styles/**/*.css',
      'src/web/map/styles/**/*.css'
    ]
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
    .pipe(gulp.dest('src/web/styles/'));
    //.pipe(gzip({append: true,gzipOptions: { level: 9 }}))
    //.pipe(gulp.dest('src/web/styles/'));
});


/**
 * Build complete web application
 */
gulp.task('build', ['deps', 'csss', 'uglify']);