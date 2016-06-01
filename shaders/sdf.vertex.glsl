precision highp float;

attribute vec2 a_pos;
attribute vec2 a_offset;
attribute vec4 a_data1;
attribute vec4 a_data2;


// matrix is for the vertex position, exmatrix is for rotating and projecting
// the extrusion vector.
uniform mat4 u_matrix;

uniform mediump float u_angle;
uniform mediump float u_zoom;
uniform bool u_skewed;
uniform bool u_alphamask;
uniform float u_extra;
uniform vec2 u_extrude_scale;
uniform vec2 u_skewed_extrude_scale;
uniform vec2 u_texsize;

varying vec2 v_tex;
varying vec2 v_fade_tex;
varying vec2 v_angle_tex;
varying float v_gamma_scale;
varying float v_mask_alpha;

void main() {
    highp float PI = 3.141592653589793;
    vec4 anchor;
    vec2 a_tex = a_data1.xy;
    mediump float a_labelminzoom = a_data1[2];
    mediump vec2 a_zoom = a_data2.st;
    mediump float a_minzoom = a_zoom[0];
    mediump float a_maxzoom = a_zoom[1];

    // u_zoom is the current zoom level adjusted for the change in font size
    mediump float z = 2.0 - step(a_minzoom, u_zoom) - (1.0 - step(a_maxzoom, u_zoom));

    mediump float a_labelangle = floor(a_data1[3]/2.0);
    mediump float a_labelline = mod(a_data1[3],2.0);

    // map-oriented labels
    if (u_skewed) {
        // line labels
        if (a_labelline == 1.0) {
            vec2 extrude = u_skewed_extrude_scale * (a_offset / 64.0);
            anchor = u_matrix * vec4(a_pos, 0, 1);
            gl_Position = u_matrix * vec4(a_pos + extrude, 0, 1);
            gl_Position.z += z * gl_Position.w;
            // v_angle_tex = vec2((a_labelangle + 128.0) / 255.0, 0.0);
            v_angle_tex = vec2((128.0 + mod(64.0 + 255.0 - u_angle,128.0)) / 255.0, 0.0);
        // billboard labels
        } else {
            highp float lineangle = mod(a_labelangle*2.0,256.0)/256.0*2.0*PI;
            vec4 anchorA = u_matrix * vec4(a_pos - vec2(cos(lineangle),sin(lineangle)), 0, 1);
            vec4 anchorB = u_matrix * vec4(a_pos + vec2(cos(lineangle),sin(lineangle)), 0, 1);
            highp float angle = mod(atan(anchorB[1]/anchorB[3] - anchorA[1]/anchorA[3], anchorB[0]/anchorB[3] - anchorA[0]/anchorA[3]) + PI, 2.0 * PI);

            if (mod(angle + 0.5 * PI, 2.0 * PI) > PI) {
                angle = mod(angle + PI, 2.0 * PI);
            }

            mat2 RotationMatrix = mat2(cos(angle),-sin(angle),sin(angle),cos(angle));

            vec2 offset = RotationMatrix * a_offset;
            vec2 extrude = u_extrude_scale * (offset / 64.0);
            gl_Position = u_matrix * vec4(a_pos, 0, 1) + vec4(extrude, 0, 0);
            v_angle_tex = vec2((128.0 + mod(32.0 + 255.0 - u_angle,128.0)) / 255.0, 0.0);
        }
    // strictly viewport-oriented labels
    } else {
        vec2 extrude = u_extrude_scale * (a_offset / 64.0);
        anchor = u_matrix * vec4(a_pos, 0, 1);
        gl_Position = u_matrix * vec4(a_pos, 0, 1) + vec4(extrude, 0, 0);
        v_mask_alpha = 1.0;
        v_angle_tex = vec2((128.0 + mod(32.0 + 255.0 - u_angle,128.0)) / 255.0, 0.0);
    }

    // position of x, y on the screen
    float y = gl_Position.y / gl_Position.w;
    // how much features are squished in all directions by the perspectiveness
    float perspective_scale = 1.0 / (1.0 - y * u_extra);
    v_gamma_scale = perspective_scale;

    // @TODO move this to loading alphamask value from an icon texture
    if (u_alphamask) {
        if (anchor[0] >= 0.0) {
            v_mask_alpha = clamp(((anchor[1]*4.0-anchor[0]) - -0.50) * 5.0, 0.0, 1.0);
        } else {
            v_mask_alpha = clamp(((anchor[1]*4.0+anchor[0]) - -0.50) * 5.0, 0.0, 1.0);
        }
    } else {
        v_mask_alpha = 1.0;
    }

    v_tex = a_tex / u_texsize;
    v_fade_tex = vec2(a_labelminzoom / 255.0, 0.0);
}