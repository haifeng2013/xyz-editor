precision lowp float;

uniform vec4 u_fill;
uniform highp float u_strokeWidth;
uniform highp float u_scale;

varying vec2 v_normal;
varying vec2 v_width;

varying float v_lengthSoFar;
varying vec2 texCoord;

uniform sampler2D u_pattern;

void main(void){

    float l_pixel = length(v_normal) * (v_width.s + v_width.t * .5);
    float alias = l_pixel - (v_width.s - v_width.t * .5);
    float alpha = 1.0 - alias / v_width.t;
    vec4 color = u_fill;

    if (alpha < 1.0){
        color.a *= alpha;
    }

    gl_FragColor = texture2D(u_pattern, vec2(fract(v_lengthSoFar))) * color;
}

