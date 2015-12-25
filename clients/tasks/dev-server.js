var gulp = require('gulp');
var watch = require('gulp-watch');
var path = require('path');
var connect = require('gulp-connect');


var Server = {
  config: {
    src: [],
    css: [],
    root: [],
    port: 8100
  }
};


gulp.task('devserver', function() {
  var portArgIndex = process.argv.indexOf('--port');
  if (portArgIndex != -1) {
    Server.Config.port = parseInt(process.argv[portArgIndex+1]);
  }
  connect.server({
    root: Server.Config.root,
    port: Server.Config.port,
    livereload: true
  });
});

/**
 * Tasks for reloading of development server when source files change
 */
gulp.task('server-src', function() {
  gulp.src(Server.Config.src)
    .pipe(connect.reload());
});

gulp.task('server-css', function() {
  gulp.src(Server.Config.css)
    .pipe(connect.reload());
});

/**
 * Detects changes in source files and triggers reload of development server
 */
gulp.task('watch-server-src', function() {
  gulp.watch(Server.Config.src, ['server-src']);
  gulp.watch(Server.Config.css, ['server-css']);
});

/**
 * Start development server on http://localhost:8100 with live reloading
 */
gulp.task('serve', ['devserver', 'watch-server-src']);

module.exports = Server;