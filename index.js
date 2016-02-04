'use strict';

var _ = require('lodash');
var fs = require('fs');
var gutil = require('gulp-util');
var through = require('through2');
var slate = require('./src/slate');

module.exports = function (opts) {
    opts = _.extend(opts, {
        path: 'dist/',
        filename: false,
        template: 'src/layout.html',
        analytics: {
            google: false
        }
    });

    function fixFilename (name) {
        var parts = name.split('/');

        var original = parts.pop();

        if (opts.filename) {
            parts.push(opts.filename);
        } else {
            original = original.replace(/\.md/, "");

            parts.push(original);
        }

        return parts.join('/');
    }

    return through.obj(
        function (file, enc, cb) {
             // file coming in :D

            fs.readFile(opts.template, 'utf8', function (err, source) {
                if (err) {
                    console.log(err);
                }

                file.path = fixFilename(file.path);

                slate(file.contents.toString(), source)
                    .then(
                        function(result) {
                            file.contents = new Buffer(result);

                            cb(null, file);//null, fileCreator(opts.filename, result, { src: true }));
                        }
                    );
            });
        }
    );
};
