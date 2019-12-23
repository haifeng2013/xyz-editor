precision lowp float;

attribute vec2 a_position;
attribute vec2 a_normal;
attribute float a_lengthSoFar;

uniform mat4 u_matrix;
uniform highp float u_strokeWidth;
uniform highp float u_scale;
uniform highp float u_zIndex;
uniform vec2 u_topLeft;
uniform float u_texWidth;
varying vec2 v_normal;
varying vec2 v_width;
varying float v_lengthSoFar;

varying vec3 v_fill;

uniform float u_capScale;
varying float v_capScale;

void main(void){

    float alias = 1.;
    if (u_strokeWidth<1.){
        alias = .65;
    }

    float width = (u_strokeWidth+alias) / u_scale;

    v_normal = a_normal;
    v_capScale = 1. / u_capScale;
    v_width = vec2(u_strokeWidth, alias);

    v_lengthSoFar = a_lengthSoFar / u_texWidth;

    gl_Position = u_matrix * vec4(u_topLeft + a_position + v_normal * width * u_capScale, u_zIndex, 1.0);
}
