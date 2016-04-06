'use strict';

var util = require('../../util/util');
var StyleLayer = require('../style_layer');
var FeatureIndex = require('../../data/feature_index');
var multiPolygonIntersectsBufferedMultiPoint = require('../../util/intersection_tests').multiPolygonIntersectsBufferedMultiPoint;

var Point = require('point-geometry');

function CircleStyleLayer() {
    StyleLayer.apply(this, arguments);
}

module.exports = CircleStyleLayer;

CircleStyleLayer.prototype = util.inherit(StyleLayer, {

    getQueryRadius: function() {
        return this.paint['circle-radius'] + Point.convert(this.paint['circle-translate']).mag();
    },

    queryIntersectsGeometry: function(queryGeometry, geometry, bearing, pixelsToTileUnits) {
        var paint = this.paint;
        var translatedPolygon = FeatureIndex.translate(queryGeometry,
            paint['circle-translate'], paint['circle-translate-anchor'],
            bearing, pixelsToTileUnits);
        var circleRadius = paint['circle-radius'] * pixelsToTileUnits;
        return multiPolygonIntersectsBufferedMultiPoint(translatedPolygon, geometry, circleRadius);
    }
});
