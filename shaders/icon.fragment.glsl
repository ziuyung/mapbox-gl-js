precision mediump float;

uniform sampler2D u_texture;
uniform sampler2D u_fadetexture;
uniform lowp float u_opacity;

varying vec2 v_tex;
varying vec2 v_fade_tex;
varying float v_mask_alpha;

void main() {
    lowp float alpha = texture2D(u_fadetexture, v_fade_tex).a * u_opacity;
    gl_FragColor = texture2D(u_texture, v_tex) * min(v_mask_alpha, alpha);

#ifdef OVERDRAW_INSPECTOR
    gl_FragColor = vec4(1.0);
#endif
}
