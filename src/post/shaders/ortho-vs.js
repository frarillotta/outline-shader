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

export { shader };
