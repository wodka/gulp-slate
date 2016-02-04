var gulp = require('gulp');
var sass = require('gulp-sass');
var concat = require('gulp-concat');
var uglify = require('gulp-uglify');
var slate = require('./index');

console.log('build the default page http://tripit.github.io/slate/ in folder dist');

gulp
    .src('src/app.scss')
    .pipe(sass())
    .pipe(gulp.dest('dist/build/'))
;

gulp
    .src('node_modules/slate/source/javascripts/app/*.js')
    .pipe(concat("app.js"))
    .pipe(uglify())
    .pipe(gulp.dest('dist/build/'))
;

gulp
    .src(
        [
            'node_modules/slate/source/javascripts/lib/_jquery.js',
            'node_modules/slate/source/javascripts/lib/_jquery_ui.js',
            'node_modules/slate/source/javascripts/lib/*.js'
        ]
    )
    .pipe(concat("libs.js"))
    .pipe(uglify())
    .pipe(gulp.dest('dist/build/'))
;

gulp
    .src('node_modules/slate/source/fonts/*')
    .pipe(gulp.dest('dist/build/'))
;

gulp
    .src('node_modules/slate/source/images/*')
    .pipe(gulp.dest('dist/images/'))
;

gulp
    .src('node_modules/slate/source/index.html.md')
    .pipe(slate())
    .pipe(gulp.dest('dist/'))
;
