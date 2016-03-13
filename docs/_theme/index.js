'use strict';

var defaultTheme = require('documentation-theme-default');

module.exports = function (comments, options, callback) {
    return defaultTheme(comments, {templateDirectory: __dirname}, callback);
};
