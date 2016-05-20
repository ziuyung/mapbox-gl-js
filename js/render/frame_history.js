'use strict';

module.exports = FrameHistory;

function FrameHistory() {
    this.changeTimes = new Float64Array(256);
    this.changeOpacities = new Uint8Array(256);
    this.opacities = new Uint8ClampedArray(256);
    this.array = new Uint8Array(this.opacities.buffer);

    this.angleDelta = new Float64Array(256);
    this.angleOpacities = new Uint8ClampedArray(256);
    this.angleArray = new Uint8Array(this.angleOpacities.buffer);

    this.fadeDuration = 300;
    this.previousZoom = 0;
    this.previousTime = 0;
    this.firstFrame = true;
}

FrameHistory.prototype.record = function(zoom, angle) {
    var now = Date.now();

    if (this.firstFrame) {
        now = 0;
        this.firstFrame = false;
    }

    zoom = Math.floor(zoom * 10);

    // angle in positive radians
    angle = ((angle + (Math.PI*2)) % (Math.PI*2))/(Math.PI*2);
    // angle scaled to 0-127
    angle = angle*128;

    var z;
    if (zoom < this.previousZoom) {
        for (z = zoom + 1; z <= this.previousZoom; z++) {
            this.changeTimes[z] = now;
            this.changeOpacities[z] = this.opacities[z];
        }
    } else {
        for (z = zoom; z > this.previousZoom; z--) {
            this.changeTimes[z] = now;
            this.changeOpacities[z] = this.opacities[z];
        }
    }

    for (z = 0; z < 256; z++) {
        var timeSince = now - this.changeTimes[z];
        var opacityChange = timeSince / this.fadeDuration * 255;
        if (z <= zoom) {
            this.opacities[z] = this.changeOpacities[z] + opacityChange;
        } else {
            this.opacities[z] = this.changeOpacities[z] - opacityChange;
        }
    }

    var a;
    var timeSince = now - this.previousTime;
    var opacityChange = Math.max(32, timeSince / this.fadeDuration * 255);
    for (a = 0; a < 128; a++) {
        var angleDelta = Math.abs(32 - ((angle + a + 32) % 64));
        var changeDirection = angleDelta - this.angleDelta[a] > 0 ? -1 : 1;
        if (angleDelta < 6) {
            this.angleOpacities[a] = 255;
        } else if (angleDelta >= 4 && angleDelta <= 8) {
            this.angleOpacities[a] = this.angleOpacities[a] + changeDirection*opacityChange;
        } else {
            this.angleOpacities[a] = 0;
        }
        this.angleDelta[a] = angleDelta;
    }
    for (a = 128; a < 256; a++) {
        var angleDelta = Math.abs(32 - ((angle + (a%128) + 32) % 64));
        var changeDirection = angleDelta - this.angleDelta[a] > 0 ? 1 : -1;
        if (angleDelta < 6) {
            this.angleOpacities[a] = 0;
        } else if (angleDelta >= 4 && angleDelta <= 8) {
            this.angleOpacities[a] = this.angleOpacities[a] + changeDirection*opacityChange;
        } else {
            this.angleOpacities[a] = 255;
        }
        this.angleDelta[a] = angleDelta;
    }

    this.zoomChanged = true;
    this.angleChanged = true;
    this.previousAngle = angle;
    this.previousZoom = zoom;
    this.previousTime = now;
};

FrameHistory.prototype.bind = function(gl) {
    if (!this.texture) {
        this.texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, this.texture);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.ALPHA, 256, 1, 0, gl.ALPHA, gl.UNSIGNED_BYTE, this.array);

    } else {
        gl.bindTexture(gl.TEXTURE_2D, this.texture);
        if (this.zoomChanged) {
            gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, 256, 1, gl.ALPHA, gl.UNSIGNED_BYTE, this.array);
            this.zoomChanged = false;
        }
    }
};

FrameHistory.prototype.bindAngle = function(gl) {
    if (!this.angleTexture) {
        this.angleTexture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, this.angleTexture);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.ALPHA, 256, 1, 0, gl.ALPHA, gl.UNSIGNED_BYTE, this.angleArray);
    } else {
        gl.bindTexture(gl.TEXTURE_2D, this.angleTexture);
        if (this.angleChanged) {
            gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, 256, 1, gl.ALPHA, gl.UNSIGNED_BYTE, this.angleArray);
            this.angleChanged = false;
        }
    }
};

