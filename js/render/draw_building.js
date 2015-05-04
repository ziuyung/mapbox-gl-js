'use strict';

var browser = require('../util/browser');
var mat3 = require('gl-matrix').mat3;
var mat4 = require('gl-matrix').mat4;
var vec3 = require('gl-matrix').vec3;

module.exports = drawBuilding;

function drawBuilding(painter, layer, tiles) {
    var gl = painter.gl;
    gl.disable(gl.STENCIL_TEST);
    for (var t = 0; t < tiles.length; t++) {
        drawBuildingTile(painter, layer, tiles[t].posMatrix, tiles[t]);
    }
    gl.enable(gl.STENCIL_TEST);
}

function drawBuildingTile(painter, layer, posMatrix, tile) {

    // No data
    if (!tile.buffers) return;
    var elementGroups = tile.elementGroups[layer.ref || layer.id];
    if (!elementGroups) return;

    if (!painter.opaquePass) return;
    painter.setSublayer(1);

    var gl = painter.gl;
    var translatedPosMatrix = painter.translateMatrix(posMatrix, tile, layer.paint['building-translate'], layer.paint['building-translate-anchor']);

    var color = layer.paint['building-color'];

    var vertex, elements, group, count;

    // Draw all buffers
    vertex = tile.buffers.buildingVertex;
    vertex.bind(gl);
    elements = tile.buffers.buildingElement;
    elements.bind(gl);

    var image = layer.paint['building-image'];
    var opacity = layer.paint['building-opacity'] || 1;
    var shader;

    if (false && image) {
        // Draw texture building
        var imagePosA = painter.spriteAtlas.getPosition(image.from, true);
        var imagePosB = painter.spriteAtlas.getPosition(image.to, true);
        if (!imagePosA || !imagePosB) return;

        shader = painter.patternShader;
        gl.switchShader(shader);
        gl.uniformMatrix4fv(shader.u_matrix, false, posMatrix);
        gl.uniform1i(shader.u_image, 0);
        gl.uniform2fv(shader.u_pattern_tl_a, imagePosA.tl);
        gl.uniform2fv(shader.u_pattern_br_a, imagePosA.br);
        gl.uniform2fv(shader.u_pattern_tl_b, imagePosB.tl);
        gl.uniform2fv(shader.u_pattern_br_b, imagePosB.br);
        gl.uniform1f(shader.u_opacity, opacity);
        gl.uniform1f(shader.u_mix, image.t);

        var factor = 8 / Math.pow(2, painter.transform.tileZoom - tile.zoom);

        var matrixA = mat3.create();
        mat3.scale(matrixA, matrixA, [
            1 / (imagePosA.size[0] * factor * image.fromScale),
            1 / (imagePosA.size[1] * factor * image.fromScale)
        ]);

        var matrixB = mat3.create();
        mat3.scale(matrixB, matrixB, [
            1 / (imagePosB.size[0] * factor * image.toScale),
            1 / (imagePosB.size[1] * factor * image.toScale)
        ]);

        gl.uniformMatrix3fv(shader.u_patternmatrix_a, false, matrixA);
        gl.uniformMatrix3fv(shader.u_patternmatrix_b, false, matrixB);

        painter.spriteAtlas.bind(gl, true);
    } else {
        // Draw buildinging rectangle.
        shader = painter.buildingShader;
        gl.switchShader(shader, translatedPosMatrix);

        var zScale = Math.pow(2, painter.transform.zoom) / 50000;
        var matrix = mat4.scale(mat4.create(), tile.posMatrix, [1, 1, zScale, 1]);
        gl.uniformMatrix4fv(shader.u_matrix, false, matrix);
        gl.uniform4fv(shader.u_color, color);

        var lightdir = [-0.5, -0.6, 0.9];
        var lightMat = mat3.create();
        mat3.rotate(lightMat, lightMat, -painter.transform.angle);
        vec3.transformMat3(lightdir, lightdir, lightMat);
        gl.uniform3fv(shader.u_lightdir, lightdir);
    }

    var offset, elementOffset;

    for (var i = 0; i < elementGroups.groups.length; i++) {
        group = elementGroups.groups[i];
        offset = group.vertexStartIndex * vertex.itemSize;
        gl.vertexAttribPointer(shader.a_pos, 3, gl.SHORT, false, 16, offset + 0);
        gl.vertexAttribPointer(shader.a_normal, 3, gl.SHORT, false, 16, offset + 8);

        count = group.elementLength;
        elementOffset = group.elementStartIndex * elements.itemSize;
        gl.drawElements(gl.TRIANGLES, count, gl.UNSIGNED_SHORT, elementOffset);
    }

    var strokeColor = layer.paint['building-outline-color'];

    // Because we're drawing top-to-bottom, we have to draw the outline first (!)
    if (layer.paint['building-antialias'] === true && !(layer.paint['building-image'] && !strokeColor)) {
        painter.setSublayer(0);

        gl.switchShader(painter.outlineShader, translatedPosMatrix);
        gl.lineWidth(2 * browser.devicePixelRatio);

        gl.uniformMatrix4fv(painter.outlineShader.u_matrix, false, tile.posMatrix);
        gl.uniform2f(painter.outlineShader.u_world, gl.drawingBufferWidth, gl.drawingBufferHeight);
        gl.uniform4fv(painter.outlineShader.u_color, strokeColor ? strokeColor : color);

        // Draw all buffers
        vertex = tile.buffers.buildingVertex;
        elements = tile.buffers.outlineElement;
        elements.bind(gl);

        for (var k = 0; k < elementGroups.groups.length; k++) {
            group = elementGroups.groups[k];
            offset = group.vertexStartIndex * vertex.itemSize;
            gl.vertexAttribPointer(painter.outlineShader.a_pos, 3, gl.SHORT, false, 16, offset + 0);

            count = group.secondElementLength * 2;
            elementOffset = group.secondElementStartIndex * elements.itemSize;
            gl.drawElements(gl.LINES, count, gl.UNSIGNED_SHORT, elementOffset);
        }
    }
}
