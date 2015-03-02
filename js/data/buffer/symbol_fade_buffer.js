'use strict';

var util = require('../../util/util');
var Buffer = require('./buffer');

module.exports = SymbolFadeBuffer;

function SymbolFadeBuffer(buffer) {
    Buffer.call(this, buffer);
}

SymbolFadeBuffer.prototype = util.inherit(Buffer, {
    defaultLength: 2048 * 16,
    itemSize: 4,
    retain: true,
    referenceTime: 0,

    add: function(placementZoom, fadeOutTime, fadeInTime) {
        var pos = this.pos;

        this.resize();
        this.ubytes[pos] = placementZoom;
        this.ubytes[pos + 1] = 0;
        this.ubytes[pos + 2] = 0;
        this.ubytes[pos + 3] = 0;

        this.pos += this.itemSize;
    },

    bind: function(gl, shader) {

        Buffer.prototype.bind.call(this, gl);

        var stride = this.itemSize;

        gl.vertexAttribPointer(shader.a_fadedata, 4, gl.UNSIGNED_BYTE, false, stride, 0);
    }
});
