'use strict';

var _ = require('lodash');
var fs = require('fs');
var gutil = require('gulp-util');
var through = require('through2');
var slate = require('./src/slate');
var Promise = require('promise');

module.exports = function (opts) {
    opts = _.extend(opts, {
        path: 'dist/',
        filename: false,
        template: 'src/layout.html',
        analytics: {
            google: false
        },
        includeLoader: function (name, mainFile) {
            return new Promise(function (resolve, reject) {
                fs.readFile(
                    changeFile(mainFile, "includes/_"+name+".md"),
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

    function changeFile (path, name) {
        var parts = path.split('/');
        parts.pop();
        parts.push(name);
        return parts.join('/');
    }

    function fixFilename (name) {
        if (opts.filename) {
            return changeFile(name, opts.filename);
        }

        return changeFile(name, name.split('/').pop().replace(/\.md/, ""));
    }

    return through.obj(
        function (file, enc, cb) {
             // file coming in :D

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
                        file.contents = new Buffer(result);
                        file.path = fixFilename(file.path);

                        cb(null, file);//null, fileCreator(opts.filename, result, { src: true }));
                    }
                );
            });
        }
    );
};
