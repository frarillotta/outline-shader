const shader = `#version 300 es
precision highp float;

in vec2 position;
in vec2 uv;

uniform vec2 resolution;
uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;

out vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = vec4( position, 1., 1. );
}
`;

const shaderV2 = `
#define STANDARD
varying vec3 vViewPosition;
#ifdef USE_TRANSMISSION
	varying vec3 vWorldPosition;
#endif
#include <common>
#include <uv_pars_vertex>
#include <uv2_pars_vertex>
#include <displacementmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
varying vec2 vUv;

void main() {
  	vUv = uv;
	#include <begin_vertex>
	#include <project_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
}

`

export { shader, shaderV2 };
