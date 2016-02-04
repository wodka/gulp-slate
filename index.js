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
var PluginError = gutil.PluginError;

var PLUGIN_NAME = 'gulp-slate';
var ROOT = __dirname + '/';

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
        return override;
    }

    return name.split('/').pop().replace(/\.md/, "");
}

/**
 * build assets
 *
 * @param opts
 * @param callback
 *
 * @returns Promise
 */
function buildAssets (opts, callback) {
    return new Promise(function (resolve) {
        es.concat(
            gulp
                .src(ROOT+'src/app.scss', {base: '.'})
                .pipe(sass())
                .pipe(rename({dirname: 'build', basename: 'app', extname: '.css'}))
                .pipe(gutil.buffer(function(err, files) {
                    _.forEach(files, function (file) {
                        callback(file);
                    });
                })),
            gulp
                .src(ROOT+'node_modules/slate/source/javascripts/app/*.js', {base: '.'})
                .pipe(concat("app.js"))
                .pipe(uglify())
                .pipe(rename({dirname: 'build', basename: 'app', extname: '.js'}))
                .pipe(gutil.buffer(function(err, files) {
                    _.forEach(files, function (file) {
                        callback(file);
                    });
                })),
            gulp
                .src(
                    [
                        ROOT+'node_modules/slate/source/javascripts/lib/_jquery.js',
                        ROOT+'node_modules/slate/source/javascripts/lib/_jquery_ui.js',
                        ROOT+'node_modules/slate/source/javascripts/lib/*.js'
                    ], {base: '.'}
                )
                .pipe(concat("libs.js"))
                .pipe(uglify())
                .pipe(rename({dirname: 'build', basename: 'libs', extname: '.js'}))
                .pipe(gutil.buffer(function(err, files) {
                    _.forEach(files, function (file) {
                        callback(file);
                    });
                })),
            gulp
                .src(
                    [
                        ROOT+'node_modules/slate/source/fonts/*',
                        ROOT+'node_modules/slate/source/images/navbar.png'
                    ], {base: '.'}
                )
                .pipe(rename(function (path) {
                    path.dirname = 'build';
                }))
                .pipe(gutil.buffer(function(err, files) {
                    _.forEach(files, function (file) {
                        callback(file);
                    });
                })),
            gulp
                .src(opts.logo, {base: '.'})
                .pipe(rename({dirname: 'images', basename: 'logo', extname: '.png'}))
                .pipe(gutil.buffer(function(err, files) {
                    _.forEach(files, function (file) {
                        callback(file);
                    });
                }))
        ).on(
            'end',
            function () {
                resolve(false);
            }
        );
    })
}

module.exports = function (opts) {
    opts = _.extend({
        assets: true,
        filename: false,
        template: ROOT+'src/layout.html',
        logo: ROOT+'node_modules/slate/source/images/logo.png',
        includeLoader: function (name, mainFile) {
            return new Promise(function (resolve) {
                var includeFile = changeFile(mainFile, "includes/_"+name+".md");

                gutil.log(PLUGIN_NAME+": include markup", includeFile);

                fs.readFile(
                    includeFile,
                    'utf-8',
                    function (err, source) {
                        if (err) {
                            throw new PluginError(
                                PLUGIN_NAME,
                                {
                                    name: 'FileOpenError',
                                    message: 'could not open include includes/_'+name+'.md'
                                }
                            );
                        } else {
                            resolve(source);
                        }
                    }
                );
            });
        }
    }, opts);

    return through.obj(
        function (file, enc, cb) {
             // file coming in :D
            var context = this;

            var assets = [];
            var files = [];
            if (opts.assets) {
                files.push(buildAssets(
                    opts,
                    function (file) {
                        assets.push(file);
                    }
                ));
            }

            files.push(new Promise(function (resolve, reject) {
                fs.readFile(opts.template, 'utf8', function (err, source) {
                    if (err) {
                        reject(new PluginError(
                            PLUGIN_NAME,
                            {
                                name: 'FileOpenError',
                                message: 'failed to load template: '+opts.template
                            }
                        ));
                        return;
                    }

                    slate(
                        file.contents.toString(),
                        source,
                        function (name) {
                            // call internal file loader
                            return opts.includeLoader(name, file.path);
                        }
                    ).then(
                        function(result) {
                            var main = new gutil.File({
                                contents: new Buffer(result),
                                path: fixFilename(file.path, opts.filename)
                            });

                            resolve(main);
                        },
                        function (err) {
                            reject(new PluginError(
                                PLUGIN_NAME,
                                {
                                    name: 'SlateError',
                                    message: err
                                }
                            ));
                        }
                    );
                });
            }));

            Promise
                .all(files)
                .then(
                    function (files) {
                        gutil.log(gutil.colors.green(PLUGIN_NAME+': finished building everything'));

                        _.forEach(files, function (file) {
                            if (!file.path) {
                                return;
                            }

                            gutil.log(PLUGIN_NAME+": push markdown", gutil.colors.dim(file.path));
                            context.push(file);
                        });

                        _.forEach(assets, function (file) {
                            if (!file.path) {
                                return;
                            }

                            gutil.log(PLUGIN_NAME+": push asset", gutil.colors.dim(file.path));
                            context.push(file);
                        });

                        cb();
                    },
                    function (error) {
                        gutil.log(gutil.colors.red(PLUGIN_NAME+': '+error.message));
                        cb(error);
                    }
                );
        }
    );
};
