precision lowp float;

uniform sampler2D u_pattern;

uniform vec4 u_fill;
uniform highp float u_strokeWidth;

varying vec2 v_normal;
varying vec2 v_width;

varying float v_lengthSoFar;
varying vec2 texCoord;


void main(void){

    float nLength = length(v_normal);
    float alpha = clamp(u_strokeWidth - nLength * u_strokeWidth, .0, 1.);

    gl_FragColor = u_fill;
    gl_FragColor.a *= alpha;
}
