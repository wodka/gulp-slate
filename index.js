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
var del = require("del");
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
 * prepare scss files, slate is not perfect...
 *
 * @returns Promise
 */
function preprocessScss (opts) {
    log(log.DEBUG, 'call preprocessSlate');

    return new Promise(function (resolve) {

        var variablesScss = [getModulePath('slate')+'/source/stylesheets/_variables.scss'];
        if (opts.variables) {
            if(!path.isAbsolute(opts.variables)) {
                opts.variables = path.join(path.dirname(module.parent.filename), opts.variables);
            }
            variablesScss.push(opts.variables);
        }

        es.concat(
            gulp
                .src(variablesScss)
                .pipe(add('fix.scss', '@function font-url($url){ @return url($url) }'))
                .pipe(concat("_variables.scss"))
                .pipe(rename({dirname: '', basename: '_variables', extname: '.scss'}))
                .pipe(gulp.dest('slate.tmp/')),
            gulp
                .src([
                    getModulePath('slate')+'/source/stylesheets/_icon-font.scss',
                    getModulePath('slate')+'/source/stylesheets/_normalize.scss',
                    getModulePath('slate')+'/source/stylesheets/print.css.scss',
                    getModulePath('slate')+'/source/stylesheets/screen.css.scss',
                    getModulePath('highlight.js')+'/../styles/solarized-light.css'
                ])
                .pipe(gulp.dest('slate.tmp/'))
            )
            .on('end', resolve);
    });
}

/**
 * build css files
 *
 * @returns Promise
 */
function processScss () {
    log(log.INFO, 'call processScss');
    return new Promise(function (resolve) {
        es.concat(
            gulp.src(['slate.tmp/screen.css.scss'])
                .pipe(sass())
                .pipe(concat("screen.scss"))
                .pipe(gulp.dest('slate.tmp/')),
            gulp.src(['slate.tmp/print.css.scss'])
                .pipe(sass())
                .pipe(concat("print.scss"))
                .pipe(gulp.dest('slate.tmp/'))
            )
            .on('end', resolve);
    });
}

/**
 * concat stuff to one css file
 *
 * @returns Promise
 */
function buildCss (opts) {
    log(log.INFO, 'call buildCss');
    return new Promise(function (resolve) {
        var rawScss = [];

        rawScss.push('@media screen { @import "slate.tmp/screen.scss"; }');
        rawScss.push('@media screen { .highlight._{ @import "slate.tmp/solarized-light"; } }');
        rawScss.push('@media print { @import "slate.tmp/print.scss"; }');

        var files = [];

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
                .pipe(gutil.buffer(function(err, result) {
                    _.forEach(result, function (file) {
                        log(log.DEBUG, "build asset "+file.path);
                        files.push(file);
                    });
                }))

            )
            .on('end', function () {
                resolve(files);
            });
    });
}

/**
 * build app js file and uglify it
 *
 * @returns Promise
 */
function buildJsApp () {
    log(log.DEBUG, 'call buildJsApp');
    return new Promise(function(resolve) {
        var files = [];
        es.concat(
            gulp
                .src(getModulePath('slate')+'/source/javascripts/app/*.js', {base: '.'})
                .pipe(concat("app.js"))
                .pipe(uglify())
                .pipe(rename({dirname: 'build', basename: 'app', extname: '.js'}))
                .pipe(gutil.buffer(function(err, result) {
                    _.forEach(result, function (file) {
                        log(log.DEBUG, "build asset "+file.path);
                        files.push(file);
                    });
                }))
            )
            .on('end', function () {
                resolve(files);
            });
    });
}

/**
 * build lib js file and uglify it
 *
 * @returns Promise
 */
function buildJsLibs () {
    log(log.DEBUG, 'call buildJsLibs');
    return new Promise(function(resolve) {
        var files = [];
        es.concat(
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
                .pipe(gutil.buffer(function(err, result) {
                    _.forEach(result, function (file) {
                        log(log.DEBUG, "build asset "+file.path);
                        files.push(file);
                    });
                }))
            )
            .on('end', function () {
                resolve(files);
            });
    });
}

/**
 * prepare static files
 *
 * @returns Promise
 */
function buildStatic (opts) {
    log(log.DEBUG, 'call buildStatic');
    return new Promise(function(resolve) {
        var files = [];
        es.concat(
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
                .pipe(gutil.buffer(function(err, result) {
                    _.forEach(result, function (file) {
                        log(log.DEBUG, "build asset "+file.path);
                        files.push(file);
                    });
                })),
            gulp
                .src(opts.logo, {base: '.'})
                .pipe(rename({dirname: 'images', basename: 'logo', extname: '.png'}))
                .pipe(gutil.buffer(function(err, result) {
                    _.forEach(result, function (file) {
                        log(log.DEBUG, "build asset "+file.path);
                        files.push(file);
                    });
                }))
            )
            .on('end', function () {
                resolve(files);
            });
    });
}

/**
 * build assets
 *
 * @param opts
 *
 * @returns Promise
 */
function buildAssets (opts) {
    log(log.DEBUG, 'call buildAssets');

    return new Promise(function (resolve) {
        preprocessScss(opts)
            .then(function () {
                return processScss();
            })
            .then(function () {
                Promise.all([
                    buildCss(opts),
                    buildJsApp(),
                    buildJsLibs(),
                    buildStatic(opts)
                ]).then(function (result) {
                    log(log.DEBUG, 'finishing up assets');
                    var files = [];
                    _.forEach(result, function (group) {
                        _.forEach(group, function (file) {
                            files.push(file);
                        })
                    });

                    resolve(files);
                }).finally(function() {
                    // cleanup tmp folder
                    del([
                        'slate.tmp'
                    ])
                });
            })
    });
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

            var promises = [];

            if (opts.assets) {
                promises.push(buildAssets(opts));
            }

            promises.push(new Promise(function (resolve, reject) {
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

                            resolve([main]);
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
                .all(promises)
                .then(
                    function (groups) {
                        log(log.DEBUG, "push files to pipe");

                        _.forEach(groups, function(files) {
                            _.forEach(files, function (file) {
                                if (!file.path) {
                                    return;
                                }

                                log(log.DEBUG, "push markdown", gutil.colors.dim(file.path));
                                context.push(file);
                            })
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
