'use strict';

var _ = require('lodash');
var fs = require('fs');
var es = require('event-stream');
var gulp = require('gulp');
var sass = require('gulp-sass');
var concat = require('gulp-concat');
var uglify = require('gulp-uglify');
var through = require('through2');
var slate = require('./src/slate');
var Promise = require('promise');
var gutil = require('gulp-util');
var rename = require("gulp-rename");

/**
 * set the current file in given path to name
 *
 * @param path
 * @param name
 *
 * @returns {string}
 */
function changeFile (path, name) {
    var parts = path.split('/');
    parts.pop();
    parts.push(name);
    return parts.join('/');
}

/**
 * change the name to the override if provided else just remove .md file ending
 *
 * @param name
 * @param override
 *
 * @returns {string}
 */
function fixFilename (name, override) {
    if (override) {
        return changeFile(name, override);
    }

    return changeFile(name, name.split('/').pop().replace(/\.md/, ""));
}

/**
 * build assets
 *
 * @param opts
 *
 * @returns Promise
 */
function buildAssets (opts, context) {
    return new Promise(function (resolve) {
        es.concat(
            gulp
                .src('src/app.scss', {base: '.'})
                .pipe(sass())
                .pipe(rename({dirname: 'build', basename: 'app', extname: '.css'}))
                .pipe(gutil.buffer(function(err, files) {
                    _.forEach(files, function (file) {
                        gutil.log("push asset", file.path);
                        context.push(file);
                    });
                })),
            gulp
                .src('node_modules/slate/source/javascripts/app/*.js', {base: '.'})
                .pipe(concat("app.js"))
                .pipe(uglify())
                .pipe(rename({dirname: 'build', basename: 'app', extname: '.js'}))
                .pipe(gutil.buffer(function(err, files) {
                    _.forEach(files, function (file) {
                        gutil.log("push asset", file.path);
                        context.push(file);
                    });
                })),
            gulp
                .src(
                    [
                        'node_modules/slate/source/javascripts/lib/_jquery.js',
                        'node_modules/slate/source/javascripts/lib/_jquery_ui.js',
                        'node_modules/slate/source/javascripts/lib/*.js'
                    ], {base: '.'}
                )
                .pipe(concat("libs.js"))
                .pipe(uglify())
                .pipe(rename({dirname: 'build', basename: 'libs', extname: '.js'}))
                .pipe(gutil.buffer(function(err, files) {
                    _.forEach(files, function (file) {
                        gutil.log("push asset", file.path);
                        context.push(file);
                    });
                })),
            gulp
                .src(
                    [
                        'node_modules/slate/source/fonts/*',
                        'node_modules/slate/source/images/navbar.png'
                    ], {base: '.'}
                )
                .pipe(rename(function (path) {
                    path.dirname = 'build';
                }))
                .pipe(gutil.buffer(function(err, files) {
                    _.forEach(files, function (file) {
                        gutil.log("push asset", file.path);
                        context.push(file);
                    });
                })),
            gulp
                .src(opts.logo, {base: '.'})
                .pipe(rename({dirname: 'images', basename: 'logo', extname: '.png'}))
                .pipe(gutil.buffer(function(err, files) {
                    _.forEach(files, function (file) {
                        gutil.log("push asset", file.path);
                        context.push(file);
                    });
                }))
        ).on(
            'end',
            function () {
                resolve('');
            }
        );
    })
}

module.exports = function (opts) {
    opts = _.extend(opts, {
        targetWrite: true,
        filename: false,
        template: 'src/layout.html',
        logo: 'node_modules/slate/source/images/logo.png',
        includeLoader: function (name, mainFile) {
            return new Promise(function (resolve) {
                var includeFile = changeFile(mainFile, "includes/_"+name+".md");

                gutil.log("include markup", includeFile);

                fs.readFile(
                    includeFile,
                    'utf-8',
                    function (err, source) {
                        if (err) {
                            console.error('could not open include', "includes/_"+name+".md");
                            resolve('');
                        } else {
                            resolve(source);
                        }
                    }
                );
            });
        }
    });

    return through.obj(
        function (file, enc, cb) {
             // file coming in :D
            var context = this;

            var files = [];
            if (opts.targetWrite) {
                files.push(buildAssets(opts, context));
            }

            files.push(new Promise(function (resolve) {
                fs.readFile(opts.template, 'utf8', function (err, source) {
                    slate(
                        file.contents.toString(),
                        source,
                        function (name) {
                            // call internal file loader
                            return opts.includeLoader(name, file.path);
                        }
                    ).then(
                        function(result) {
                            gutil.log("push main file");

                            file.contents = new Buffer(result);
                            file.path = fixFilename(file.path, opts.filename);

                            context.push(file);
                        }
                    );
                });
            }));

            Promise
                .all(files)
                .then(function () {
                    console.log('finished building everything');
                    cb();
                });
        }
    );
};
