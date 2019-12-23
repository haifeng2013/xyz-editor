precision lowp float;

uniform vec4 u_fill;
uniform highp float u_scale;

varying vec2 v_normal;
varying vec2 v_width;

varying float v_lengthSoFar;
varying vec2 texCoord;
uniform sampler2D u_pattern;

varying vec3 v_fill;
varying float v_capScale;

void main(void){

    float nLength = length(v_normal);

    if(nLength>v_capScale)discard;

    nLength /= v_capScale;

    float l_pixel = nLength * (v_width.s + v_width.t * 0.5);
    float alias = l_pixel - (v_width.s - v_width.t * 0.5);
    float alpha = 1.0 - alias / v_width.t;

    gl_FragColor = u_fill;

    if (alpha < 1.0){
        gl_FragColor.a *= alpha;
    }
}

