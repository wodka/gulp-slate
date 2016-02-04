var gulp = require('gulp');
var gutil = require('gulp-util');
var slate = require('./index');

console.log('build the default page http://tripit.github.io/slate/ in folder dist');

gulp
    .src('node_modules/slate/source/index.html.md')
    .pipe(slate(
        {
            logo: 'node_modules/slate/source/images/logo.png'
        }
    ))
    //.on('error', gutil.log)
    .pipe(gulp.dest('dist/'))
;
