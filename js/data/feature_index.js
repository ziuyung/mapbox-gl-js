'use strict';

var Point = require('point-geometry');
var loadGeometry = require('./load_geometry');
var EXTENT = require('./bucket').EXTENT;
var featureFilter = require('feature-filter');
var StructArrayType = require('../util/struct_array');
var Grid = require('grid-index');
var DictionaryCoder = require('../util/dictionary_coder');
var vt = require('vector-tile');
var Protobuf = require('pbf');
var GeoJSONFeature = require('../util/vectortile_to_geojson');
var arraysIntersect = require('../util/util').arraysIntersect;

var FeatureIndexArray = new StructArrayType({
    members: [
        // the index of the feature in the original vectortile
        { type: 'Uint32', name: 'featureIndex' },
        // the source layer the feature appears in
        { type: 'Uint16', name: 'sourceLayerIndex' },
        // the bucket the feature appears in
        { type: 'Uint16', name: 'bucketIndex' }
    ]});

module.exports = FeatureIndex;

function FeatureIndex(coord, overscaling, collisionTile) {
    if (coord.grid) {
        var serialized = coord;
        var rawTileData = overscaling;
        coord = serialized.coord;
        overscaling = serialized.overscaling;
        this.grid = new Grid(serialized.grid);
        this.featureIndexArray = new FeatureIndexArray(serialized.featureIndexArray);
        this.rawTileData = rawTileData;
        this.bucketLayerIDs = serialized.bucketLayerIDs;
    } else {
        this.grid = new Grid(EXTENT, 16, 0);
        this.featureIndexArray = new FeatureIndexArray();
    }
    this.coord = coord;
    this.overscaling = overscaling;
    this.x = coord.x;
    this.y = coord.y;
    this.z = coord.z - Math.log(overscaling) / Math.LN2;
    this.setCollisionTile(collisionTile);
}

FeatureIndex.prototype.insert = function(feature, featureIndex, sourceLayerIndex, bucketIndex) {
    var key = this.featureIndexArray.length;
    this.featureIndexArray.emplaceBack(featureIndex, sourceLayerIndex, bucketIndex);
    var geometry = loadGeometry(feature);

    for (var r = 0; r < geometry.length; r++) {
        var ring = geometry[r];

        // TODO: skip holes when we start using vector tile spec 2.0

        var bbox = [Infinity, Infinity, -Infinity, -Infinity];
        for (var i = 0; i < ring.length; i++) {
            var p = ring[i];
            bbox[0] = Math.min(bbox[0], p.x);
            bbox[1] = Math.min(bbox[1], p.y);
            bbox[2] = Math.max(bbox[2], p.x);
            bbox[3] = Math.max(bbox[3], p.y);
        }

        this.grid.insert(key, bbox[0], bbox[1], bbox[2], bbox[3]);
    }
};

FeatureIndex.prototype.setCollisionTile = function(collisionTile) {
    this.collisionTile = collisionTile;
};

FeatureIndex.prototype.serialize = function() {
    var data = {
        coord: this.coord,
        overscaling: this.overscaling,
        grid: this.grid.toArrayBuffer(),
        featureIndexArray: this.featureIndexArray.serialize(),
        bucketLayerIDs: this.bucketLayerIDs
    };
    return {
        data: data,
        transferables: [data.grid, data.featureIndexArray.arrayBuffer]
    };
};

// Finds features in this tile at a particular position.
FeatureIndex.prototype.query = function(args, styleLayers) {
    if (!this.vtLayers) {
        this.vtLayers = new vt.VectorTile(new Protobuf(new Uint8Array(this.rawTileData))).layers;
        this.sourceLayerCoder = new DictionaryCoder(this.vtLayers ? Object.keys(this.vtLayers).sort() : ['_geojsonTileLayer']);
    }

    var result = {};

    var params = args.params || {},
        pixelsToTileUnits = EXTENT / args.tileSize / args.scale,
        filter = featureFilter(params.filter);

    // Features are indexed their original geometries. The rendered geometries may
    // be buffered, translated or offset. Figure out how much the search radius needs to be
    // expanded by to include these features.
    var additionalRadius = 0;
    for (var id in styleLayers) {
        additionalRadius = Math.max(additionalRadius, styleLayers[id].getQueryRadius() * pixelsToTileUnits);
    }

    var queryGeometry = args.queryGeometry.map(function(q) {
        return q.map(function(p) {
            return new Point(p.x, p.y);
        });
    });

    var minX = Infinity;
    var minY = Infinity;
    var maxX = -Infinity;
    var maxY = -Infinity;
    for (var i = 0; i < queryGeometry.length; i++) {
        var ring = queryGeometry[i];
        for (var k = 0; k < ring.length; k++) {
            var p = ring[k];
            minX = Math.min(minX, p.x);
            minY = Math.min(minY, p.y);
            maxX = Math.max(maxX, p.x);
            maxY = Math.max(maxY, p.y);
        }
    }

    var matching = this.grid.query(minX - additionalRadius, minY - additionalRadius, maxX + additionalRadius, maxY + additionalRadius);
    matching.sort(topDownFeatureComparator);
    this.filterMatching(result, matching, this.featureIndexArray, queryGeometry, filter, params.layers, styleLayers, args.bearing, pixelsToTileUnits);

    var matchingSymbols = this.collisionTile.queryRenderedSymbols(minX, minY, maxX, maxY, args.scale);
    matchingSymbols.sort();
    this.filterMatching(result, matchingSymbols, this.collisionTile.collisionBoxArray, queryGeometry, filter, params.layers, styleLayers, args.bearing, pixelsToTileUnits);

    return result;
};

function topDownFeatureComparator(a, b) {
    return b - a;
}

FeatureIndex.prototype.filterMatching = function(result, matching, array, queryGeometry, filter, filterLayerIDs, styleLayers, bearing, pixelsToTileUnits) {
    var previousIndex;
    for (var k = 0; k < matching.length; k++) {
        var index = matching[k];

        // don't check the same feature more than once
        if (index === previousIndex) continue;
        previousIndex = index;

        var match = array.get(index);

        var layerIDs = this.bucketLayerIDs[match.bucketIndex];
        if (filterLayerIDs && !arraysIntersect(filterLayerIDs, layerIDs)) continue;

        var sourceLayerName = this.sourceLayerCoder.decode(match.sourceLayerIndex);
        var sourceLayer = this.vtLayers[sourceLayerName];
        var feature = sourceLayer.feature(match.featureIndex);

        if (!filter(feature)) continue;

        var geometry = null;

        for (var l = 0; l < layerIDs.length; l++) {
            var layerID = layerIDs[l];

            if (filterLayerIDs && filterLayerIDs.indexOf(layerID) < 0) {
                continue;
            }

            var styleLayer = styleLayers[layerID];
            if (!styleLayer) continue;

            if (styleLayer.type !== 'symbol') {
                // all symbols already match the style

                if (!geometry) geometry = loadGeometry(feature);

                if (!styleLayer.queryIntersectsGeometry(queryGeometry, geometry, bearing, pixelsToTileUnits)) continue;
            }

            var geojsonFeature = new GeoJSONFeature(feature, this.z, this.x, this.y);
            geojsonFeature.layer = styleLayer.serialize({
                includeRefProperties: true
            });
            var layerResult = result[layerID];
            if (layerResult === undefined) {
                layerResult = result[layerID] = [];
            }
            layerResult.push(geojsonFeature);
        }
    }
};

FeatureIndex.translate = function (queryGeometry, translate, translateAnchor, bearing, pixelsToTileUnits) {
    if (!translate[0] && !translate[1]) {
        return queryGeometry;
    }

    translate = Point.convert(translate);

    if (translateAnchor === "viewport") {
        translate._rotate(-bearing);
    }

    var translated = [];
    for (var i = 0; i < queryGeometry.length; i++) {
        var ring = queryGeometry[i];
        var translatedRing = [];
        for (var k = 0; k < ring.length; k++) {
            translatedRing.push(ring[k].sub(translate._mult(pixelsToTileUnits)));
        }
        translated.push(translatedRing);
    }
    return translated;
};
