'use strict';

var util = require('../../util/util');
var StyleLayer = require('../style_layer');
var FeatureIndex = require('../../data/feature_index');
var multiPolygonIntersectsMultiPolygon = require('../../util/intersection_tests').multiPolygonIntersectsMultiPolygon;

var Point = require('point-geometry');

function FillStyleLayer() {
    StyleLayer.apply(this, arguments);
}

module.exports = FillStyleLayer;

FillStyleLayer.prototype = util.inherit(StyleLayer, {

    getQueryRadius: function() {
        return Point.convert(this.paint['fill-translate']).mag();
    },

    queryIntersectsGeometry: function(queryGeometry, geometry, bearing, pixelsToTileUnits) {
        var paint = this.paint;
        var translatedPolygon = FeatureIndex.translate(queryGeometry,
            paint['fill-translate'], paint['fill-translate-anchor'],
            bearing, pixelsToTileUnits);
        return multiPolygonIntersectsMultiPolygon(translatedPolygon, geometry);
    }
});
