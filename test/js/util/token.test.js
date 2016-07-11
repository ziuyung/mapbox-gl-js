'use strict';

var test = require('tap').test;
var resolveStringValue = require('../../../js/util/token');

test('token', function(t) {
    t.equal('', resolveStringValue({name:'14th St NW'}, ''));
    t.equal('literal', resolveStringValue({name:'14th St NW'}, 'literal'));
    t.equal('14th St NW', resolveStringValue({name:'14th St NW'}, '{name}'));
    t.equal('', resolveStringValue({text:'14th St NW'}, '{name}'));
    t.equal('1400', resolveStringValue({num:1400}, '{num}'));
    t.equal('500 m', resolveStringValue({num:500}, '{num} m'));
    t.equal('3 Fine Fields', resolveStringValue({a:3, b:'Fine', c:'Fields'}, '{a} {b} {c}'));
    t.equal(' but still', resolveStringValue({}, '{notset} but still'));
    t.equal('dashed', resolveStringValue({'dashed-property': 'dashed'}, '{dashed-property}'));
    t.equal('150 m', resolveStringValue({'HØYDE': 150}, '{HØYDE} m'));
    t.equal('mapbox', resolveStringValue({'$special:characters;': 'mapbox'}, '{$special:characters;}'));

    t.equal('', resolveStringValue({name: 'Louisiana'}, {
        type: 'selection',
        cases: []
    }));
    t.equal('', resolveStringValue({name: 'Louisiana'}, {
        type: 'selection',
        cases: [[], [], []]
    }));
    t.equal('abc', resolveStringValue({name: 'Louisiana'}, {
        type: 'selection',
        cases: [['abc']]
    }));
    t.equal('', resolveStringValue({name: 'Louisiana'}, {
        type: 'selection',
        cases: [[], ['abc']]
    }));
    t.equal('abc', resolveStringValue({name: 'Louisiana'}, {
        type: 'selection',
        cases: [['a', 'b', 'c']]
    }));
    t.equal('', resolveStringValue({}, {
        type: 'selection',
        cases: [['“', {ref: 'name'}, '”']]
    }));
    t.equal('?', resolveStringValue({}, {
        type: 'selection',
        cases: [
            ['“', {ref: 'name'}, '”'],
            '?'
        ]
    }));
    t.equal('“”', resolveStringValue({name: ''}, {
        type: 'selection',
        cases: [['“', {ref: 'name'}, '”']]
    }));
    t.equal('“”', resolveStringValue({name: ''}, {
        type: 'selection',
        cases: [
            ['“', {ref: 'name'}, '”'],
            '?'
        ]
    }));
    t.equal('“Louisiana”', resolveStringValue({name: 'Louisiana'}, {
        type: 'selection',
        cases: [['“', {ref: 'name'}, '”']]
    }));
    t.equal('?', resolveStringValue({name: 'Louisiana', 'name_fr': 'Louisiane'}, {
        type: 'selection',
        cases: [
            ['“', {ref: 'name_en'}, '”'],
            [{ref: 'name_en'}],
            '?'
        ]
    }));
    t.equal('‘Louisiana’', resolveStringValue({name: 'Louisiana', 'name_fr': 'Louisiane'}, {
        type: 'selection',
        cases: [
            ['“', {ref: 'name_en'}, '”'],
            ['‘', {ref: 'name'}, '’']
        ]
    }));
    t.equal('«Louisiane»', resolveStringValue({name: 'Louisiana', 'name_fr': 'Louisiane'}, {
        type: 'selection',
        cases: [
            ['«', {ref: 'name_fr'}, '»'],
            ['‘', {ref: 'name'}, '’']
        ]
    }));
    t.equal('Louisiana (Louisiane)', resolveStringValue({name: 'Louisiana', 'name_fr': 'Louisiane'}, {
        type: 'selection',
        cases: [
            [{ref: 'name'}, ' (', {ref: 'name_lou'}, ')'],
            [{ref: 'name'}, ' (', {ref: 'name_fr'}, ')'],
            [{ref: 'name'}]
        ]
    }));
    t.equal('Louisiana', resolveStringValue({name: 'Louisiana', 'name_fr': 'Louisiane'}, {
        type: 'selection',
        cases: [
            [{ref: 'name'}, ' (', {ref: ''}, ')'],
            [{ref: 'name'}, ' (', {ref: 'name_lou'}, ')'],
            [{ref: 'name'}]
        ]
    }));
    t.equal('Louisiana (Louisiane)', resolveStringValue({name: 'Louisiana', '': 'Louisiane'}, {
        type: 'selection',
        cases: [
            [{ref: 'name'}, ' (', {ref: ''}, ')'],
            [{ref: 'name'}, ' (', {ref: 'name_fr'}, ')'],
            [{ref: 'name'}]
        ]
    }));
    t.deepEqual(['⚜Louisiane', '⚜Louisiana'], resolveStringValue({name: 'Louisiana', 'name_fr': 'Louisiane'}, {
        type: 'selection',
        cases: [
            ['⚜', {ref: 'name_en'}],
            ['⚜', {ref: 'name_fr'}],
            ['⚜', {ref: 'name_lou'}],
            ['⚜', {ref: 'name'}]
        ]
    }, true));

    t.end();
});
