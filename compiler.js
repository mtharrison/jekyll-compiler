'use strict';

const Fs = require('fs');
const Path = require('path');

const stripComments = function (source) {
    return new Promise((resolve, reject) => {
        resolve(source.toString().replace(/\@\*.+\*\@/g, ''));
    });
};

const parseSections = function (source) {

    const pattern = '\\@section (\\w+) ?\{\\s*([^}]+)}';
    const globalRegex = new RegExp(pattern, 'g');
    const localRegex = new RegExp(pattern);
    let sections = source.match(globalRegex) || [];
    source = source.replace(globalRegex, '');

    // Parse out initial text into sections

    sections = sections.map((s) => {
        const parts = s.match(localRegex);
        return { type: parts[1].toLowerCase(), text: parts[2] };
    });

    // Parse out any asset include tags

    const assetRegex = '@(Scripts|Styles).Render\\("(.*)"\\)';

    sections = sections.map((s) => {
        s.text = s.text.replace(new RegExp(assetRegex, 'g'), function (match, type, file) {
            if (type === 'Styles') {
                return '<link rel="stylesheet" href="' + file.replace('~', '') + '">';
            }
            else {
                return '<script src="' + file.replace('~', '') + '"></script>';
            }
        });
        return s;
    });

    return new Promise((resolve, reject) => {
        resolve([source, sections]);
    });
};

const removeHeader = function (data) {

    let source = data[0];
    let sections = data[1];

    return new Promise((resolve, reject) => {

        const regex = /\@\s?\{[^}]+}/g;
        resolve([source.replace(regex, ''), sections]);
    });
};

const stripBlankLines = function (data) {

    let source = data[0];
    let sections = data[1];

    return new Promise((resolve, reject) => {
        const regex = /^(?:[\t ]*(?:\r?\n|\r))+/g;
        resolve([source.replace(regex, ''), sections]);
    });
};

const addHeader = function (data) {

    let source = data[0];
    let sections = data[1];

    return new Promise((resolve, reject) => {
        let header = '---\n';
        sections.push({ type: 'layout', text: 'LayoutMaster'});
        for (let i = 0; i < sections.length; i++) {
            header += sections[i].type + ': |\n' + '\t' + sections[i].text;
        }
        header += '\n---\n\n';
        source = header + source;
        resolve(source);
    });
};

const output = function (dest) {
    return function (source) {
        return new Promise((resolve, reject) => {
            Fs.writeFile(dest, source, (err) => {
                if (err)
                    return reject(err);
                resolve();
            });
        });
    }
};

module.exports = function (source) {

    return stripComments(source)
        .then(parseSections)
        .then(removeHeader)
        .then(stripBlankLines)
        .then(addHeader);
};
