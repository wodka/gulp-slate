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
var add = require("gulp-add");
var path = require("path");
var PluginError = gutil.PluginError;

var PLUGIN_NAME = 'gulp-slate';
var ROOT = __dirname + '/';

/**
 * set the current file in given path to name
 *
 * @param srcPath
 * @param name
 *
 * @returns {string}
 */
function changeFile (srcPath, name) {
    var path = require('path');
    var parts = srcPath.split(path.sep);
    parts.pop();
    parts.push(name);
    return parts.join(path.sep);
}

/**
 * get the path of the module
 *
 * @param name
 *
 * @returns {string}
 */
function getModulePath(name) {
    if (name == 'slate') {
        return ROOT+'node_modules/slate';
    }

    return path.dirname(require.resolve(name));
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
 * @param level
 * @internal message
 */
function log(level) {
    var args;

    if(arguments) {
        args = Array.prototype.slice.call(arguments);
        args.shift();
    } else {
        args.push('message missing');
    }

    args.unshift('['+gutil.colors.blue(PLUGIN_NAME)+']');

    if (level >= log.level) {
        gutil.log.apply(this, args);
    }
}

log.DEBUG = 0;
log.INFO = 10;
log.WARN = 20;
log.ERROR = 30;

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
        var rawScss = [];
        if (opts.variables) {
            if(!path.isAbsolute(opts.variables)) {
                opts.variables = path.join(path.dirname(module.parent.filename), opts.variables);
            }
            rawScss.push('@import "'+opts.variables+'";');
        }
        rawScss.push('@import "'+getModulePath('slate')+'/source/stylesheets/_variables.scss";');
        rawScss.push('@function font-url($url){ @return url($url) }');
        rawScss.push('@media screen { @import "'+getModulePath('slate')+'/source/stylesheets/screen.css.scss"; }');
        rawScss.push('@media screen { .highlight._{ @import "'+getModulePath('highlight.js')+'/../styles/solarized-light"; } }');
        rawScss.push('@media print { @import "'+getModulePath('slate')+'/source/stylesheets/print.css.scss"; }');

        es.concat(
            gulp
                .src(
                    [
                        opts.scss,
                        getModulePath('highlight.js')+'/styles/'+opts.style+'.css'
                    ],
                    {
                        base: '.'
                    }
                )
                .pipe(add('raw.scss', rawScss.join("\n"), true))
                .pipe(concat("app.scss"))
                .pipe(sass())
                .pipe(concat("app.css"))
                .pipe(rename({dirname: 'build', basename: 'app', extname: '.css'}))
                .pipe(gutil.buffer(function(err, files) {
                    _.forEach(files, function (file) {
                        log(log.DEBUG, "build asset "+file.path);
                        callback(file);
                    });
                })),
            gulp
                .src(getModulePath('slate')+'/source/javascripts/app/*.js', {base: '.'})
                .pipe(concat("app.js"))
                .pipe(uglify())
                .pipe(rename({dirname: 'build', basename: 'app', extname: '.js'}))
                .pipe(gutil.buffer(function(err, files) {
                    _.forEach(files, function (file) {
                        log(log.DEBUG, "build asset "+file.path);
                        callback(file);
                    });
                })),
            gulp
                .src(
                    [
                        getModulePath('slate')+'/source/javascripts/lib/_jquery.js',
                        getModulePath('slate')+'/source/javascripts/lib/_jquery_ui.js',
                        getModulePath('slate')+'/source/javascripts/lib/*.js'
                    ], {base: '.'}
                )
                .pipe(concat("libs.js"))
                .pipe(uglify())
                .pipe(rename({dirname: 'build', basename: 'libs', extname: '.js'}))
                .pipe(gutil.buffer(function(err, files) {
                    _.forEach(files, function (file) {
                        log(log.DEBUG, "build asset "+file.path);
                        callback(file);
                    });
                })),
            gulp
                .src(
                    [
                        getModulePath('slate')+'/source/fonts/*',
                        getModulePath('slate')+'/source/images/navbar.png'
                    ], {base: '.'}
                )
                .pipe(rename(function (path) {
                    path.dirname = 'build';
                }))
                .pipe(gutil.buffer(function(err, files) {
                    _.forEach(files, function (file) {
                        log(log.DEBUG, "build asset "+file.path);
                        callback(file);
                    });
                })),
            gulp
                .src(opts.logo, {base: '.'})
                .pipe(rename({dirname: 'images', basename: 'logo', extname: '.png'}))
                .pipe(gutil.buffer(function(err, files) {
                    _.forEach(files, function (file) {
                        log(log.DEBUG, "build asset "+file.path);
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
        log: 'WARN',
        assets: true,
        filename: false,
        style: 'solarized-dark',
        template: ROOT+'src/layout.html',
        scss: ROOT+'src/app.scss',
        variables: null,
        logo: getModulePath('slate')+'/source/images/logo.png',
        includeLoader: function (name, mainFile) {
            return new Promise(function (resolve) {
                var includeFile = changeFile(mainFile, "includes/_"+name+".md");

                log(log.INFO, "include markup", includeFile);

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

    if (typeof log[opts.log] === "number") {
        log.level = log[opts.log];
    } else {
        log.level = 20;
    }

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
                        log(log.DEBUG, "push files to pipe");

                        _.forEach(files, function (file) {
                            if (!file.path) {
                                return;
                            }

                            log(log.DEBUG, "push markdown", gutil.colors.dim(file.path));
                            context.push(file);
                        });

                        _.forEach(assets, function (file) {
                            if (!file.path) {
                                return;
                            }

                            log(log.DEBUG, "push asset", gutil.colors.dim(file.path));
                            context.push(file);
                        });

                        log(log.INFO, gutil.colors.green('finished building'));

                        cb();
                    },
                    function (error) {
                        log(log.ERROR, gutil.colors.red(error.message));
                        cb(error);
                    }
                );
        }
    );
};
