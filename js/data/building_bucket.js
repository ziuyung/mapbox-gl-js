'use strict';

var ElementGroups = require('./element_groups');
var earcut = require('earcut');
var classifyRings = require('../util/classify_rings');
var Point = require('point-geometry');

module.exports = BuildingBucket;

function BuildingBucket(buffers) {
    this.buffers = buffers;
    this.elementGroups = new ElementGroups(buffers.buildingVertex, buffers.buildingElement, buffers.outlineElement);
}

BuildingBucket.prototype.addFeatures = function() {
    var start = self.performance.now();
    self.tesselateTime = self.tesselateTime || 0;

    var features = this.features;
    for (var i = this.features.length - 1; i >= 0; i--) {
        var feature = features[i];
        this.addFeature(feature.loadGeometry(), feature.properties.levels || 2);
    }

    self.tesselateTime += self.performance.now() - start;
};

BuildingBucket.prototype.addFeature = function(lines, levels) {
    var polygons = classifyRings(convertCoords(lines));
    for (var i = 0; i < polygons.length; i++) {
        this.addPolygon(polygons[i], levels);
    }
};

BuildingBucket.prototype.addPolygon = function(polygon, levels) {

    var numVertices = 0;
    for (var k = 0; k < polygon.length; k++) {
        numVertices += polygon[k].length;
    }

    this.elementGroups.makeRoomFor(numVertices);

    var buildingVertex = this.buffers.buildingVertex,
        buildingElement = this.buffers.buildingElement,
        outlineElement = this.buffers.outlineElement,
        elementGroup = this.elementGroups.current,
        startIndex = buildingVertex.index - elementGroup.vertexStartIndex,
        flattened = [],
        holeIndices = [],
        prevIndex;

    var h = levels * 3;

    for (var r = 0; r < polygon.length; r++) {
        var ring = polygon[r];
        prevIndex = undefined;

        if (r > 0) continue;
        if (r > 0) holeIndices.push(flattened.length / 2);

        for (var v = 0; v < ring.length; v++) {
            var vertex = ring[v];

            var currentIndex = buildingVertex.index - elementGroup.vertexStartIndex;
            buildingVertex.add(vertex[0], vertex[1], h, 0, 0, 1, 1);
            elementGroup.vertexLength++;

            if (v >= 1) {
                outlineElement.add(prevIndex, currentIndex);
                elementGroup.secondElementLength++;
            }

            prevIndex = currentIndex;

            // convert to format used by earcut
            flattened.push(vertex[0]);
            flattened.push(vertex[1]);
        }

        for (var s = 0; s < ring.length - 1; s++) {
            var v1 = ring[s];
            var v2 = ring[s + 1];
            var perp = Point.convert(v2)._sub(Point.convert(v1))._perp()._unit();
            var index = buildingVertex.index - elementGroup.vertexStartIndex;
            buildingVertex.add(v1[0], v1[1], 0, perp.x, perp.y, 0, 0);
            buildingVertex.add(v1[0], v1[1], h, perp.x, perp.y, 0, 1);
            buildingVertex.add(v2[0], v2[1], 0, perp.x, perp.y, 0, 0);
            buildingVertex.add(v2[0], v2[1], h, perp.x, perp.y, 0, 1);
            elementGroup.vertexLength += 4;
            buildingElement.add(index, index + 1, index + 2);
            buildingElement.add(index + 1, index + 2, index + 3);
            elementGroup.elementLength += 6;
        }
    }

    var triangleIndices = earcut(flattened, holeIndices);

    for (var i = 0; i < triangleIndices.length; i += 3) {
        buildingElement.add(triangleIndices[i] + startIndex,
                triangleIndices[i + 1] + startIndex,
                triangleIndices[i + 2] + startIndex);
        elementGroup.elementLength += 3;
    }
};

function convertCoords(rings) {
    var result = [];
    for (var i = 0; i < rings.length; i++) {
        var ring = [];
        for (var j = 0; j < rings[i].length; j++) {
            var p = rings[i][j];
            ring.push([p.x, p.y]);
        }
        result.push(ring);
    }
    return result;
}
