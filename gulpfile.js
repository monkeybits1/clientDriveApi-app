'use strict';

var gulp = require('gulp');
var shell = require('gulp-shell');
var minimist = require('minimist');
var rename = require('gulp-rename');
var debug = require('gulp-debug');
var del = require('del');
var headerfooter = require('gulp-headerfooter');
var deleteLines = require('gulp-delete-lines');
var runSequence = require('run-sequence');

// minimist structure and defaults for this task configuration
var knownOptions = {
  string: ['env'],
  'default': {
    env: 'dev'
  }
};
var options = minimist(process.argv.slice(2), knownOptions);

// The root working directory where code is edited
var srcRoot = 'dist';
var serverRoot = 'serverCode';

// The root staging folder for gapps configurations
var dstRoot = 'build/' + options.env + '/src';

// runs "ng-build", "copy-latest" and "gapps-upload" in a sequence order
gulp.task('upload-latest', function(){
    runSequence(
      'ng-build',
      'copy-latest',
      'gapps-upload'
    )
});

// task "ng-build" runs "ng build" shell command
gulp.task('ng-build', shell.task(['ng build']));

// task "copy-latest" copies all files to staging folder
// "clean-deployment" is a prerequisite for starting the copy process
gulp.task('copy-latest', ['clean-deployment'], function() {
  copyAngularCode();
  copyIndexFile();
  copyGoogleServerFiles();
});

// task "gapps-upload" runs "gapps upload" shell command
gulp.task('gapps-upload', shell.task(['gapps upload'],{cwd: 'build/' + options.env}));

// delete all files and folders in staging folder
gulp.task('clean-deployment', function(cb) {
  return del([
    dstRoot + '/*.*',
    dstRoot + '/**/*.*'
  ]);
});

//ignores map files
//all js files converted to html files
//adds <script> tag to those files
function copyAngularCode() {
  return gulp.src([
    srcRoot + '/**.js'
  ])
  .pipe(
    rename(function(path) {
      if (path.extname !== '.html' && path.extname !== '.map') {
        path.extname = path.extname + '.html';
        }
        return path;
      }))
      .pipe(headerfooter.header('<script>\n'))
      .pipe(headerfooter.footer('\n</script>'))
      .pipe(gulp.dest(dstRoot)); //changed from dstRoot
}


//copies singular index file
function copyIndexFile() {
  return gulp.src([
    srcRoot + '/index.html'
  ])
  //delete script line, last body tag, and last html tag.
  //these rows get recreated below.
  .pipe(deleteLines({
    'filters': [
      /<script\s+type=["']text\/javascript["']\s+src=/i
    ]
  }))
  .pipe(deleteLines({
    'filters': [
      /<\/html/
    ]
  }))
  //update script files to use include statements
  //append body and html tags at end of file
  .pipe(headerfooter.footer("\n<?!= include('inline.bundle.js.html'); ?>\n"))
  .pipe(headerfooter.footer("<?!= include('polyfills.bundle.js.html'); ?>\n"))
  .pipe(headerfooter.footer("<?!= include('styles.bundle.js.html'); ?>\n"))
  .pipe(headerfooter.footer("<?!= include('vendor.bundle.js.html'); ?>\n"))
  .pipe(headerfooter.footer("<?!= include('main.bundle.js.html'); ?>\n"))
  .pipe(headerfooter.footer("</body>\n </html>"))
  .pipe(gulp.dest(dstRoot));
}

//copies js files for google server calls
function copyGoogleServerFiles() {
  return gulp.src([
    serverRoot + '/**.js'
  ])
  .pipe(gulp.dest(dstRoot));
}

// optional task: watch the changes and print them out
gulp.task('watch', function(){
  gulp.watch(['serverCode/*.*', 'src/*/*.*'],function(e){
    var paths = e.path.split('/');
    var path = paths.slice(8, paths.length).join('/');
    var time = new Date().toString().split(' ').slice(4,5);
    console.log(time + ' '+ path + ' was ' + e.type );
  })
});

