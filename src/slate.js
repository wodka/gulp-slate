/**
 * logic to parse markdown files
 *
 * @see https://github.com/jmanek/slate_node
 *
 * @author Michael Schramm (changes to integrate with gulp)
 * @author Jesse Manek (creator of https://github.com/jmanek/slate_node)
 *
 * @private
 */

var _ = require('lodash');
var marked = require('marked');
var highlight = require('highlight.js');
var Handlebars = require('handlebars');
var Promise = require('promise');

marked.setOptions({
    renderer: new marked.Renderer(),
    gfm: true,
    tables: true,
    breaks: false,
    pedantic: true,
    sanitize: false,
    smartLists: true,
    smartypants: false,
    highlight: function (code, lang) {
        var parts = lang.split('>', 2);

        if (parts.length == 2) {
            lang = parts[1];
        }

        return highlight.highlight(lang, code).value;
    }
});

//Easier than changing Slate's js
marked.defaults.langPrefix = 'highlight ';

Handlebars.registerHelper('str', function(item){
    return '"' + item + '"';
});

Handlebars.registerHelper('html', function(content){
    return new Handlebars.SafeString(content);
});

Handlebars.registerHelper('json', function(context) {
    return JSON.stringify(context);
});

/**
 * return a parsed template
 *
 * @param markup
 * @param template
 * @param includesLoader
 */
module.exports = function (markup, template, includesLoader) {
    includesLoader = includesLoader || function () { return ''; };

    // // marked doens't recognize "shell"?
    markup = markup.replace(/```shell/gm, '```bash');
    markup = markup.split(/(?:^|\n)---\n/g);

    if (markup.length === 1) {
        throw new Error('No markdown page settings found!');
    }

    var data = {};
    var tokens = new marked.Lexer().lex(markup[1]);
    var token;
    var listName;

    for (var idx = 0; idx < tokens.length; idx++) {
        token = tokens[idx];

        if (token.type === 'list_item_start' && listName){
            token = tokens[idx+1].text;
            if (listName === 'language_tabs' && token === 'shell'){
                token = 'bash';
            }
            data[listName].push(token);
            idx += 2;
        }

        if (token.type === 'paragraph') {

            if (tokens[idx+1] !== undefined && tokens[idx+1].type === 'list_start') {

                listName = token.text.slice(0, -1);
                data[listName] = [];

            } else {

                token = token.text.split(': ');
                data[token[0]] = token[1];

            }
        }
    }

    var markdown = [];
    markdown.push(markup.slice(2).join(''));

    _.forEach(data['includes'], function (include) {
        // can be either a string or a promise
        markdown.push(includesLoader(include));
    });

    return new Promise(function (resolve, reject) {
        Promise.all(markdown)
            .then(
                function (res) {
                    marked(
                        res.join(''),
                        function (err, content) {
                            if (err) {
                                reject(err);
                            }

                            data['content'] = content
                                .replace(/pre><code([^>]+)/g, 'pre$1><code')
                                .replace(/class="highlight ([^&"]+)&([^"]+)"/g, 'class="highlight $1"')
                            ;

                            resolve(Handlebars.compile(template)(data));
                        }
                    );
                }
            );
    });
};
