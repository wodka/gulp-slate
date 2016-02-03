'use strict';

var gutil = require('gulp-util');
var through = require('through2');

module.exports = function (opts) {
    opts = opts || {};


    return through.obj(
        function (file, enc, cb) {
             // file coming in :D

            // build a single file
        },
        function (cb) {

            // got all files :D
            cb(new gutil.PluginError('gulp-slate', 'failed to check markdown'));
        }
    );
};
