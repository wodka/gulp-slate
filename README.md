# gulp-slate

node.js with port of tripit/slate to be included in gulp :)

## special features

### code blocks in main content

   ```_>javascript
   will render javascript in main content
   ```

## usage

### Instalation
```console
npm install gulp-slate --save
```

### Gulp Setup

now you can setup a gulp task to handle the build
```javascript
// inside of gulpfile.js
var gulp = require('gulp');
var slate = require('gulp-slate');

gulp.task('slate', function () {
    return gulp.src(
        [
            'node_modules/gulp-slate/node_modules/slate/source/index.html.md'
        ]
    )
        .pipe(slate())
        .pipe(gulp.dest('dist/'))
    ;
});
```

### First Build

this is really simple since the task is already setup:

```console
gulp slate
```

now go on and host the dist/ folder somewhere

### simple webserver
```console
python -m SimpleHTTPServer 8000
```

now open http://localhost:8000 in a browser of your choice, result should look exactly like http://tripit.github.io/slate/

### Neat Features

If you need different Language groups use an Alias: angular>javascript for javascript highlighting in the angular group

## automate development

you can use browserSync

I will now asume that your repository looks like this:

    .
    ├── dist
    ├── docs
    │   ├── custom.scss
    │   └── index.html.md
    ├── gulpfile.js
    └── package.json

### installation

```console
npm install browser-sync --save
```

### gulpfile.js
```javascript
var gulp = require('gulp');
var slate = require('gulp-slate');
var browserSync = require('browser-sync').create();

gulp.task('slate', function () {
    return gulp.src('docs/index.html.md')
        .pipe(slate({
            scss: 'docs/custom.scss'
        }))
        .pipe(gulp.dest('dist/'))
        .on('end', browserSync.reload)
    ;
});

gulp.task('serve', ['slate'], function() {

    browserSync.init({
        port: 8080,
        server: {
            baseDir: "./dist"
        }
    });

    gulp.watch('docs/**', ['slate']);
});

```

### run it :)

this will start browserSync, watch for changes inside of docs and refresh your browser!

```console
gulp serve
```

## configuration

### constructor(options)
#### options.assets
add assets to current stream

Type: `Boolean`<br><br>Default `true`

#### options.filename
set the filename - warning: only use one input file! else only the last one will show up

Type: `String`<br><br>Default `index.html.md` will become `index.html`

#### options.log
log level: DEBUG|INFO|WARN|ERROR

Type: `String`<br><br>Default `WARN`

#### options.style
Highlighting style, use any name from https://github.com/isagalaev/highlight.js/tree/master/src/styles

Type: `String`<br><br>Default `solarized-dark`

#### options.template
Template to render - in general you should never need to touch this

Type: `String`<br><br>Default `src/layout.html`

#### options.scss
If you need to override certain css parameters, do not forget to include the original app.scss if you change this

Type: `String`<br><br>Default `src/app.scss`

#### options.variables
load your own variables, default variables from slate are always loaded first

Type: `String`<br><br>Default `null`

#### options.logo
to have a custom logo added to the page

Type: `String`<br><br>Default `node_modules/slate/source/images/logo.png`

#### options.includeLoader
where to load includes from, the function receives the name as well as the
path to the main markdown file and should return a promise that resolves the file content

Type: `Function`<br><br>Default `error` will be loaded from `includes/_error.md`

## thanks to
* https://github.com/jmanek/slate_node
* https://github.com/tripit/slate
