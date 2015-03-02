'use strict';

var TileCoord = require('../source/tile_coord');
var interpolate = require('../util/interpolate').number;

module.exports = {
    merge: mergePlacementLayers,
    fade: fadePlacementLayers
};

function mergePlacementLayers(oldPlacementBuffers, newPlacementBuffers, oldBuffers, transform, oldTileID, newTileID, maxzoom) {

    var blockerPos = TileCoord.fromID(oldTileID);
    var blockeePos = TileCoord.fromID(newTileID);
    var scale = 1 / Math.pow(2, Math.min(blockerPos.z, maxzoom) - Math.min(blockeePos.z, maxzoom));
    var translateX = (blockerPos.x * scale - blockeePos.x) * 4096;
    var translateY = (blockerPos.y * scale - blockeePos.y) * 4096;

    var oldGlyphUbytes = new Uint8Array(oldBuffers.glyphFade.array);
    var oldIconUbytes = new Uint8Array(oldBuffers.iconFade.array);
    var sinceOld = Date.now() - oldBuffers.glyphFade.referenceTime;

    var currentZoom = transform.zoom * 10;
    for (var id in newPlacementBuffers) {
        if (!oldPlacementBuffers[id]) continue;
        mergePlacementLayer(newPlacementBuffers[id].text, oldPlacementBuffers[id].text, oldGlyphUbytes, scale, translateX, translateY, currentZoom, sinceOld);
        mergePlacementLayer(newPlacementBuffers[id].icon, oldPlacementBuffers[id].icon, oldIconUbytes, scale, translateX, translateY, currentZoom, sinceOld);
    }

    // TODO what about layers that are in old, but not new?
}

var fadeIn = 0;
var instantFadeIn = 1;
var fadeOut = 2;
var instantFadeOut = 3;

function mergePlacementLayer(newPlacement, oldPlacement, ubytes, scale, translateX, translateY, currentZoom, sinceOld) {

    newPlacement = new Int32Array(newPlacement);
    oldPlacement = new Int32Array(oldPlacement);

    var minX = translateX;
    var minY = translateY;
    var maxX = 4096 * scale + translateX;
    var maxY = 4096 * scale + translateY;
    var tolerance = 8;

    var size = 8;
    var oldPos = 0;
    var newPos = 0;
    while (oldPos < oldPlacement.length && newPos < newPlacement.length) {
        var oldID = oldPlacement[oldPos];
        var newID = newPlacement[newPos];

        if (oldID === newID) {
            var oldPosp = oldPos;
            var newX = newPlacement[newPos + 1] * scale + translateX;
            var newY = newPlacement[newPos + 2] * scale + translateY;
            var newPlacementZoom = newPlacement[newPos + 3];

            while (oldPlacement[oldPosp] === newID) {
                var oldX = oldPlacement[oldPosp + 1];
                var oldY = oldPlacement[oldPosp + 2];
                var oldPlacementZoom = oldPlacement[oldPosp + 3];

                if (Math.abs(oldX - newX) < tolerance && Math.abs(oldY - newY) < tolerance) {
                    // found a match

                    if ((currentZoom <= oldPlacementZoom) === (currentZoom <= newPlacementZoom)) {
                        newPlacement[newPos + 6] = instantFadeIn;
                        oldPlacement[oldPosp + 6] = instantFadeOut;

                        var vertexOffset = oldPlacement[oldPosp + 4];
                        var oldFromOpacity = ubytes[vertexOffset * 4 + 1];
                        var oldToOpacity = ubytes[vertexOffset * 4 + 2];
                        var oldStartTime = ubytes[vertexOffset * 4 + 3];
                        var currentOpacity = interpolate(oldFromOpacity, oldToOpacity, Math.min(1, (sinceOld + oldStartTime) / 300));
                        newPlacement[newPos + 7] = currentOpacity;

                    } else {
                        newPlacement[newPos + 6] = fadeIn;
                        oldPlacement[oldPosp + 6] = fadeOut;
                    }
                    break;
                }

                oldPosp += size;
            }

            if (oldPlacement[oldPosp] !== newID) {
                // no match for newID was found
                if (newPlacement[newPos + 6] !== instantFadeIn) {
                    newPlacement[newPos + 6] = fadeIn;
                }
            }

            newPos += size;

        } else if (oldID < newID) {
            var x = oldPlacement[oldPos + 1];
            var y = oldPlacement[oldPos + 2];

            if (minX <= x && x < maxX &&
                minY <= y && y < maxY &&
                oldPlacement[oldPos + 6] !== instantFadeOut) {

                // label is covered by the blocking tile. fade it out.
                oldPlacement[oldPos + 6] = fadeOut;
            }

            oldPos += size;
        } else {
            // no match
            newPos += size;
        }
    }
}

function fadePlacementLayers(placementLayers, buffers) {

    var glyphUbytes = new Uint8Array(buffers.glyphFade.array);
    var iconUbytes = new Uint8Array(buffers.glyphFade.array);

    var sinceOld = Date.now() - buffers.glyphFade.referenceTime;
    buffers.glyphFade.referenceTime = buffers.iconFade.referenceTime = Date.now();
    buffers.glyphFade.dirty = true;
    buffers.iconFade.dirty = true;

    for (var id in placementLayers) {
        fadePlacementLayer(placementLayers[id].text, glyphUbytes, sinceOld);
        fadePlacementLayer(placementLayers[id].icon, iconUbytes, sinceOld);
    }
}

function fadePlacementLayer(placementLayer, ubytes, sinceOld) {
    placementLayer = new Int32Array(placementLayer);

    var fromOpacity, toOpacity, startTime;

    for (var pos = 0; pos < placementLayer.length; pos += 8) {
        var vertexOffset = placementLayer[pos + 4];
        var vertexLength = placementLayer[pos + 5];
        var fadeType = placementLayer[pos + 6];

        var oldFromOpacity = ubytes[vertexOffset * 4 + 1];
        var oldToOpacity = ubytes[vertexOffset * 4 + 2];
        var oldStartTime = ubytes[vertexOffset * 4 + 3];
        var currentOpacity = interpolate(oldFromOpacity, oldToOpacity, Math.min(1, (sinceOld + oldStartTime) / 300));

        if (oldToOpacity === 0) {
            if (fadeType === fadeOut) {
                startTime = oldStartTime + sinceOld;
                fromOpacity = oldFromOpacity;
                toOpacity = 0;

            } else if (fadeType === instantFadeOut) {
                startTime = 0;
                fromOpacity = 0;
                toOpacity = 0;

            } else if (fadeType === fadeIn) {
                startTime = 0;
                fromOpacity = currentOpacity;
                toOpacity = 255;

            } else if (fadeType === instantFadeIn) {
                startTime = 0;
                fromOpacity = placementLayer[pos + 7];
                toOpacity = 255;

            } else {
                throw "unreachable";
            }

        } else if (oldToOpacity === 255) {
            if (fadeType === fadeOut) {
                startTime = 0;
                fromOpacity = currentOpacity;
                toOpacity = 0;

            } else if (fadeType === instantFadeOut) {
                startTime = 0;
                fromOpacity = 0;
                toOpacity = 0;

            } else if (fadeType === fadeIn) {
                startTime = oldStartTime + sinceOld;
                fromOpacity = oldFromOpacity;
                toOpacity = 255;

            } else if (fadeType === instantFadeIn) {
                startTime = oldStartTime + sinceOld;
                fromOpacity = oldFromOpacity;
                toOpacity = 255;

            } else {
                throw "unreachable";
            }

        } else {
            throw "unreachable";
        }

        for (var v = 0; v < vertexLength; v++) {
            ubytes[(vertexOffset + v) * 4 + 1] = fromOpacity;
            ubytes[(vertexOffset + v) * 4 + 2] = toOpacity;
            ubytes[(vertexOffset + v) * 4 + 3] = Math.min(255, startTime);
        }
    }
}
