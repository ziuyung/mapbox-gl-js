'use strict';

var test = require('tap').test;
var resolveTokens = require('../../../js/util/token');

test('token', function(t) {
    t.equal('', resolveTokens({name:'14th St NW'}, ''));
    t.equal('literal', resolveTokens({name:'14th St NW'}, 'literal'));
    t.equal('14th St NW', resolveTokens({name:'14th St NW'}, '{name}'));
    t.equal('', resolveTokens({text:'14th St NW'}, '{name}'));
    t.equal('1400', resolveTokens({num:1400}, '{num}'));
    t.equal('500 m', resolveTokens({num:500}, '{num} m'));
    t.equal('3 Fine Fields', resolveTokens({a:3, b:'Fine', c:'Fields'}, '{a} {b} {c}'));
    t.equal(' but still', resolveTokens({}, '{notset} but still'));
    t.equal('dashed', resolveTokens({'dashed-property': 'dashed'}, '{dashed-property}'));
    t.equal('150 m', resolveTokens({'HØYDE': 150}, '{HØYDE} m'));
    t.equal('mapbox', resolveTokens({'$special:characters;': 'mapbox'}, '{$special:characters;}'));

    t.equal('', resolveTokens({name:'Louisiana'}, {
        type: 'substitution',
        value: []
    }));
    t.equal('abc', resolveTokens({name:'Louisiana'}, {
        type: 'substitution',
        value: ['abc']
    }));
    t.equal('abc', resolveTokens({name:'Louisiana'}, {
        type: 'substitution',
        value: ['a', 'b', 'c']
    }));
    t.equal('“”', resolveTokens({name:''}, {
        type: 'substitution',
        value: ['“', {ref: 'name'}, '”']
    }));
    t.equal('“Louisiana”', resolveTokens({name: 'Louisiana'}, {
        type: 'substitution',
        value: ['“', {ref: 'name'}, '”']
    }));
    t.equal('“?”', resolveTokens({name: 'Louisiana', 'name_fr': 'Louisiane'}, {
        type: 'substitution',
        value: ['“', {ref: 'name_en', default: '?'}, '”']
    }));
    t.equal('“Louisiana”', resolveTokens({name: 'Louisiana', 'name_fr': 'Louisiane'}, {
        type: 'substitution',
        value: ['“', {ref: 'name_en', default: {ref: 'name'}}, '”']
    }));
    t.equal('“Louisiane”', resolveTokens({name: 'Louisiana', 'name_fr': 'Louisiane'}, {
        type: 'substitution',
        value: ['“', {ref: 'name_fr', default: {ref: 'name'}}, '”']
    }));
    t.equal('Louisiana (Louisiane)', resolveTokens({name: 'Louisiana', 'name_fr': 'Louisiane'}, {
        type: 'substitution',
        value: [{ref: 'name'}, ' (', {ref: 'name_lou', default: {ref: 'name_fr', default: '⚜'}}, ')']
    }));
    t.equal('Louisiana ()', resolveTokens({name: 'Louisiana', 'name_fr': 'Louisiane'}, {
        type: 'substitution',
        value: [{ref: 'name'}, ' (', {ref: '', default: {ref: 'name_lou'}}, ')']
    }));
    t.equal('Louisiana (Louisiane)', resolveTokens({name: 'Louisiana', '': 'Louisiane'}, {
        type: 'substitution',
        value: [{ref: 'name'}, ' (', {ref: '', default: {ref: 'name_fr', default: '⚜'}}, ')']
    }));

    t.end();
});
