'use strict';

var util = require('../util/util');
var Evented = require('../util/evented');
var TileCoord = require('./tile_coord');
var Source = require('./source');
var combinePlacementLayers = require('../placement/fade_placement_layer');

module.exports = VectorTileSource;

function VectorTileSource(options) {
    util.extend(this, util.pick(options, 'url', 'tileSize'));

    if (this.tileSize !== 512) {
        throw new Error('vector tile sources must have a tileSize of 512');
    }

    Source._loadTileJSON.call(this, options);

    this.updateAngle = util.throttle(this.updateAngle, 300, this);
}

VectorTileSource.prototype = util.inherit(Evented, {
    minzoom: 0,
    maxzoom: 22,
    tileSize: 512,
    reparseOverscaled: true,
    fadeDuration: 3000,
    _loaded: false,

    onAdd: function(map) {
        this.map = map;
    },

    loaded: function() {
        return this._pyramid && this._pyramid.loaded();
    },

    update: function(transform) {
        if (this._pyramid) {
            this._pyramid.update(this.used, transform);
            this.placementsDirty = true;
        }
    },

    reload: function() {
        this._pyramid.reload();
    },

    updateAngle: function() {
        var ids = this._pyramid.orderedIDs();
        for (var i = 0; i < ids.length; i++) {
            var tile = this._pyramid.getTile(ids[i]);
            this._redoTilePlacement(tile);
        }
    },

    render: function() {
        if (this.placementsDirty) {
            this._mergeTilePlacements();
            this.placementsDirty = false;
        }
        Source._renderTiles.apply(this, arguments);
    },

    featuresAt: Source._vectorFeaturesAt,

    _loadTile: function(tile) {
        var overscaling = tile.zoom > this.maxzoom ? Math.pow(2, tile.zoom - this.maxzoom) : 1;
        var params = {
            url: TileCoord.url(tile.id, this.tiles, this.maxzoom),
            id: tile.uid,
            tileId: tile.id,
            zoom: tile.zoom,
            maxZoom: this.maxzoom,
            tileSize: this.tileSize * overscaling,
            source: this.id,
            overscaling: overscaling,
            angle: this.map.transform.angle
        };

        if (tile.workerID) {
            this.dispatcher.send('reload tile', params, this._tileLoaded.bind(this, tile), tile.workerID);
        } else {
            tile.workerID = this.dispatcher.send('load tile', params, this._tileLoaded.bind(this, tile));
        }
    },

    _tileLoaded: function(tile, err, data) {
        if (tile.aborted)
            return;

        if (err) {
            this.fire('tile.error', {tile: tile});
            return;
        }

        this.placementsDirty = true;

        tile.loadVectorData(data);
        this.fire('tile.load', {tile: tile});
        this._redoTilePlacement(tile);
    },

    _abortTile: function(tile) {
        tile.aborted = true;
        this.dispatcher.send('abort tile', { id: tile.uid, source: this.id }, null, tile.workerID);
    },

    _addTile: function(tile) {
        this.fire('tile.add', {tile: tile});
    },

    _removeTile: function(tile) {
        this.fire('tile.remove', {tile: tile});
    },

    _unloadTile: function(tile) {
        tile.unloadVectorData(this.map.painter);
        this.glyphAtlas.removeGlyphs(tile.uid);
        this.dispatcher.send('remove tile', { id: tile.uid, source: this.id }, null, tile.workerID);
    },

    _redoTilePlacement: function(tile) {
        var source = this;

        this.dispatcher.send('redo placement', { id: tile.uid, source: this.id, angle: source.map.transform.angle }, done, tile.workerID);

        function done(_, data) {
            tile.reloadSymbolData(data, source.map.painter);
            source.fire('tile.load', {tile: tile});
        }
    },

    _mergeTilePlacements: function() {
        if (!this._pyramid) return;

        var ids = this._pyramid.renderedIDs().reverse();
        if (!ids.length) return;

        var tileTreeNodes = {};
        var tileRootNodes = [];
        var minZ = TileCoord.fromID(ids[0]).z;

        for (var i = 0; i < ids.length; i++) {
            var tile = this._pyramid.getTile(ids[i]);

            var parentID = ids[i];
            var parentNode;
            do {
                parentID = TileCoord.parent(parentID, this.maxzoom);
                parentNode = tileTreeNodes[parentID];
            } while (TileCoord.fromID(parentID).z >= minZ && !parentNode);

            var tileNode = {
                tile: tile,
                children: []
            };

            if (parentNode) {
                parentNode.children.push(tileNode);
            } else {
                tileRootNodes.push(tileNode);
            }

            tileTreeNodes[ids[i]] = tileNode;
        }

        for (var k = 0; k < tileRootNodes.length; k++) {
            this._mergeTilePlacement(tileRootNodes[k].tile, tileRootNodes[k].children);
        }

        for (var j = 0; j < ids.length; j++) {
            var fadeTile = tileTreeNodes[ids[j]].tile;
           combinePlacementLayers.fade(fadeTile.symbolFadeBuffers, fadeTile.buffers);
        }
    },

    _mergeTilePlacement: function(tile, children) {
        var childCoversParent = true;

        // which direction?
        // what scale/translation and tolerance?
        for (var c = 0; c < children.length; c++) {
            var child = children[c];
            var blocker = childCoversParent ? child.tile : tile;
            var blocked = childCoversParent ? tile : child.tile;

           combinePlacementLayers.merge(blocked.symbolFadeBuffers, blocker.symbolFadeBuffers, blocked.buffers, this.map.transform, blocked.id, blocker.id, this.maxzoom);

            this._mergeTilePlacement(child.tile, child.children);
        }
    }
});
