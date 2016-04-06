'use strict';

var util = require('../../util/util');
var StyleLayer = require('../style_layer');
var FeatureIndex = require('../../data/feature_index');
var multiPolygonIntersectsBufferedMultiLine = require('../../util/intersection_tests').multiPolygonIntersectsBufferedMultiLine;

var Point = require('point-geometry');

function LineStyleLayer() {
    StyleLayer.apply(this, arguments);
}

module.exports = LineStyleLayer;

LineStyleLayer.prototype = util.inherit(StyleLayer, {

    getPaintValue: function(name, zoom, zoomHistory) {
        var value = StyleLayer.prototype.getPaintValue.call(this, name, zoom, zoomHistory);

        // If the line is dashed, scale the dash lengths by the line
        // width at the previous round zoom level.
        if (value && name === 'line-dasharray') {
            var flooredZoom = Math.floor(zoom);
            if (this._flooredZoom !== flooredZoom) {
                this._flooredZoom = flooredZoom;
                this._flooredLineWidth = this.getPaintValue('line-width', flooredZoom, Infinity);
            }

            value.fromScale *= this._flooredLineWidth;
            value.toScale *= this._flooredLineWidth;
        }

        return value;
    },

    getQueryRadius: function() {
        var paint = this.paint;
        return getLineWidth(paint) / 2 + Math.abs(paint['line-offset']) + Point.convert(paint['line-translate']).mag();
    },

    queryIntersectsGeometry: function(queryGeometry, geometry, bearing, pixelsToTileUnits) {
        var paint = this.paint;
        var translatedPolygon = FeatureIndex.translate(queryGeometry,
                paint['line-translate'], paint['line-translate-anchor'],
                bearing, pixelsToTileUnits);
        var halfWidth = getLineWidth(paint) / 2 * pixelsToTileUnits;
        if (paint['line-offset']) {
            geometry = offsetLine(geometry, paint['line-offset'] * pixelsToTileUnits);
        }
        return multiPolygonIntersectsBufferedMultiLine(translatedPolygon, geometry, halfWidth);
    }
});

function getLineWidth(paint) {
    if (paint['line-gap-width'] > 0) {
        return paint['line-gap-width'] + 2 * paint['line-width'];
    } else {
        return paint['line-width'];
    }
}

function offsetLine(rings, offset) {
    var newRings = [];
    var zero = new Point(0, 0);
    for (var k = 0; k < rings.length; k++) {
        var ring = rings[k];
        var newRing = [];
        for (var i = 0; i < ring.length; i++) {
            var a = ring[i - 1];
            var b = ring[i];
            var c = ring[i + 1];
            var aToB = i === 0 ? zero : b.sub(a)._unit()._perp();
            var bToC = i === ring.length - 1 ? zero : c.sub(b)._unit()._perp();
            var extrude = aToB._add(bToC)._unit();

            var cosHalfAngle = extrude.x * bToC.x + extrude.y * bToC.y;
            extrude._mult(1 / cosHalfAngle);

            newRing.push(extrude._mult(offset)._add(b));
        }
        newRings.push(newRing);
    }
    return newRings;
}
