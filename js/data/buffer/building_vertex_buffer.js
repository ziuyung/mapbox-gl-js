'use strict';

var util = require('../../util/util');
var Buffer = require('./buffer');

module.exports = BuildingVertexBuffer;

function BuildingVertexBuffer(buffer) {
    Buffer.call(this, buffer);
}

var factor = Math.pow(2, 13);

BuildingVertexBuffer.prototype = util.inherit(Buffer, {
    itemSize: 16, // bytes per vertex (4 * short == 4 bytes)

    add: function(x, y, z, nx, ny, nz, t) {
        var pos2 = this.pos / 2;

        this.resize();

        this.shorts[pos2 + 0] = x;
        this.shorts[pos2 + 1] = y;
        this.shorts[pos2 + 2] = z;

        this.shorts[pos2 + 4] = Math.floor(nx * factor) * 2 + t;
        this.shorts[pos2 + 5] = ny * factor * 2;
        this.shorts[pos2 + 6] = nz * factor * 2;

        this.pos += this.itemSize;
    }
});
