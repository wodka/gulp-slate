# gulp-slate

build a nice api documentation


TODO add documentation

## usage

```
npm install gulp-slate --save
```


now you can setup a gulp task to handle the build
```
// inside of gulpfile.js
var gulp = require('gulp');
var slate = require('gulp-slate');

gulp.task('slate', function () {
    return gulp.src(
        [
            'docs/index.html.md'
        ]
    )
        .pipe(slate())
        .pipe(gulp.dest('dist/'))
    ;
});
```

### build it

this is really simple since the task is already setup:

```
gulp slate
```

now go on and host the dist/ folder somewhere

## thanks to
* https://github.com/jmanek/slate_node
* https://github.com/tripit/slate

## howto test it

```
npm install

node test.js

cd dist
python -m SimpleHTTPServer 8000
```

will give you the same output as http://tripit.github.io/slate/
