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
varying float v_gamma_scale;
varying float v_mask_alpha;

void main() {
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
    mediump float a_labeldelta = mod(u_angle + a_labelangle + 32.0, 64.0);

    if (a_labelline == 1.0) {
        vec2 extrude = u_skewed_extrude_scale * (a_offset / 64.0);
        anchor = u_matrix * vec4(a_pos, 0, 1);
        gl_Position = u_matrix * vec4(a_pos + extrude, 0, 1);
        gl_Position.z += z * gl_Position.w;
        if (u_skewed) {
            v_mask_alpha = clamp(abs(32.0-a_labeldelta)*0.5 - 3.0, 0.0, 1.0);
        } else {
            v_mask_alpha = 1.0;
        }
    } else {
        highp float Angle = 32.0/255.0*2.0*3.141592653589793;
        mat4 RotationMatrix = mat4( cos( Angle ), -sin( Angle ), 0.0, 0.0,
            sin( Angle ),  cos( Angle ), 0.0, 0.0,
            0.0,           0.0, 1.0, 0.0,
            0.0,           0.0, 0.0, 1.0 );
        // mat4 billboard_rotate_matrix = mat4(cos, -1.0 * sin, sin, cos);

        vec4 offset = RotationMatrix * vec4(a_offset, 0, 0);
        vec2 extrude = u_extrude_scale * (vec2(offset[0], offset[1]) / 64.0);
        anchor = u_matrix * vec4(a_pos, 0, 1);
        gl_Position = u_matrix * vec4(a_pos, 0, 1) + vec4(extrude, 0, 0);
        if (u_skewed) {
            v_mask_alpha = clamp(4.0 - abs(32.0-a_labeldelta)*0.5, 0.0, 1.0);
        } else {
            v_mask_alpha = 1.0;
        }
    }

    // position of x, y on the screen
    float y = gl_Position.y / gl_Position.w;
    // how much features are squished in all directions by the perspectiveness
    float perspective_scale = 1.0 / (1.0 - y * u_extra);
    v_gamma_scale = perspective_scale;

    if (u_alphamask) {
        if (anchor[0] >= 0.0) {
            v_mask_alpha = min(v_mask_alpha, clamp(((anchor[1]*4.0-anchor[0]) - -0.50) * 5.0, 0.0, 1.0));
        } else {
            v_mask_alpha = min(v_mask_alpha, clamp(((anchor[1]*4.0+anchor[0]) - -0.50) * 5.0, 0.0, 1.0));
        }
    }

    v_tex = a_tex / u_texsize;
    v_fade_tex = vec2(a_labelminzoom / 255.0, 0.0);
}
