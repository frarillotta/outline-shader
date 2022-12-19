import React, { forwardRef, useMemo } from "react";
import { Effect, RenderPass, NormalPass, Pass } from "postprocessing";
import {
	Uniform,
	WebGLRenderTarget,
	TextureLoader,
	RepeatWrapping,
	RGBAFormat,
	HalfFloatType,
	NearestFilter,
	MeshDepthMaterial,
	BasicDepthPacking,
	DoubleSide,
	Color,
  DepthFormat,
  UnsignedShortType,
  DepthTexture,
  UnsignedIntType,
} from "three";
import { shader as sobel } from "./shaders/sobel.js";
import { shader as aastep } from "./shaders/aastep.js";
import { shader as luma } from "./shaders/luma.js";
import { shader as darken } from "./shaders/blend-darken.js";
import { DepthPass } from "./DepthPassWithSimpleFormat.js";
import { useThree } from "@react-three/fiber";

const fragmentShader = `
  precision highp float;

  uniform sampler2D colorTexture;
  uniform sampler2D normalTexture;
  uniform sampler2D depthTexture;
  uniform float scale;
  uniform float thickness;
  uniform float angle;
  uniform sampler2D paperTexture;
  uniform float cameraNear;
  uniform float cameraFar;

  ${sobel}
  
  ${luma}
  
  ${aastep}
  
  ${darken}
  float dither8x8(vec2 position, float brightness) {
    int x = int(mod(position.x, 8.0));
    int y = int(mod(position.y, 8.0));
    int index = x + y * 8;
    float limit = 0.0;
    if (x < 8) {
      if (index == 0) limit = 0.015625;
      if (index == 1) limit = 0.515625;
      if (index == 2) limit = 0.140625;
      if (index == 3) limit = 0.640625;
      if (index == 4) limit = 0.046875;
      if (index == 5) limit = 0.546875;
      if (index == 6) limit = 0.171875;
      if (index == 7) limit = 0.671875;
      if (index == 8) limit = 0.765625;
      if (index == 9) limit = 0.265625;
      if (index == 10) limit = 0.890625;
      if (index == 11) limit = 0.390625;
      if (index == 12) limit = 0.796875;
      if (index == 13) limit = 0.296875;
      if (index == 14) limit = 0.921875;
      if (index == 15) limit = 0.421875;
      if (index == 16) limit = 0.203125;
      if (index == 17) limit = 0.703125;
      if (index == 18) limit = 0.078125;
      if (index == 19) limit = 0.578125;
      if (index == 20) limit = 0.234375;
      if (index == 21) limit = 0.734375;
      if (index == 22) limit = 0.109375;
      if (index == 23) limit = 0.609375;
      if (index == 24) limit = 0.953125;
      if (index == 25) limit = 0.453125;
      if (index == 26) limit = 0.828125;
      if (index == 27) limit = 0.328125;
      if (index == 28) limit = 0.984375;
      if (index == 29) limit = 0.484375;
      if (index == 30) limit = 0.859375;
      if (index == 31) limit = 0.359375;
      if (index == 32) limit = 0.0625;
      if (index == 33) limit = 0.5625;
      if (index == 34) limit = 0.1875;
      if (index == 35) limit = 0.6875;
      if (index == 36) limit = 0.03125;
      if (index == 37) limit = 0.53125;
      if (index == 38) limit = 0.15625;
      if (index == 39) limit = 0.65625;
      if (index == 40) limit = 0.8125;
      if (index == 41) limit = 0.3125;
      if (index == 42) limit = 0.9375;
      if (index == 43) limit = 0.4375;
      if (index == 44) limit = 0.78125;
      if (index == 45) limit = 0.28125;
      if (index == 46) limit = 0.90625;
      if (index == 47) limit = 0.40625;
      if (index == 48) limit = 0.25;
      if (index == 49) limit = 0.75;
      if (index == 50) limit = 0.125;
      if (index == 51) limit = 0.625;
      if (index == 52) limit = 0.21875;
      if (index == 53) limit = 0.71875;
      if (index == 54) limit = 0.09375;
      if (index == 55) limit = 0.59375;
      if (index == 56) limit = 1.0;
      if (index == 57) limit = 0.5;
      if (index == 58) limit = 0.875;
      if (index == 59) limit = 0.375;
      if (index == 60) limit = 0.96875;
      if (index == 61) limit = 0.46875;
      if (index == 62) limit = 0.84375;
      if (index == 63) limit = 0.34375;
    }
    return brightness < limit ? 0.0 : 1.0;
  }
  vec3 dither8x8(vec2 position, vec3 color) {
    return color * dither8x8(position, luma(color));
  }
  vec4 dither8x8(vec2 position, vec4 color) {
    return vec4(color.rgb * dither8x8(position, luma(color)), 1.0);
  }

  
  #define TAU 6.28318530718
  
  float readDepth( sampler2D depthSampler, vec2 coord ) {
    float fragCoordZ = texture2D( depthSampler, coord ).x;
    float viewZ = perspectiveDepthToViewZ( fragCoordZ, cameraNear, cameraFar );
    return viewZToOrthographicDepth( viewZ, cameraNear, cameraFar );
  }
  
  vec4 sobelDepth(in sampler2D src, in vec2 uv, in vec2 resolution, in float width){
    float x = width / resolution.x;
    float y = width / resolution.y;
    vec4 horizEdge = vec4( 0.0 );
    horizEdge -= readDepth(src, vec2( uv.x - x, uv.y - y ) ) * 1.0;
    horizEdge -= readDepth(src, vec2( uv.x - x, uv.y     ) ) * 2.0;
    horizEdge -= readDepth(src, vec2( uv.x - x, uv.y + y ) ) * 1.0;
    horizEdge += readDepth(src, vec2( uv.x + x, uv.y - y ) ) * 1.0;
    horizEdge += readDepth(src, vec2( uv.x + x, uv.y     ) ) * 2.0;
    horizEdge += readDepth(src, vec2( uv.x + x, uv.y + y ) ) * 1.0;
    vec4 vertEdge = vec4( 0.0 );
    vertEdge -= readDepth(src, vec2( uv.x - x, uv.y - y ) ) * 1.0;
    vertEdge -= readDepth(src, vec2( uv.x    , uv.y - y ) ) * 2.0;
    vertEdge -= readDepth(src, vec2( uv.x + x, uv.y - y ) ) * 1.0;
    vertEdge += readDepth(src, vec2( uv.x - x, uv.y + y ) ) * 1.0;
    vertEdge += readDepth(src, vec2( uv.x    , uv.y + y ) ) * 2.0;
    vertEdge += readDepth(src, vec2( uv.x + x, uv.y + y ) ) * 1.0;
    vec4 edge = sqrt((horizEdge * horizEdge) + (vertEdge * vertEdge));
    return edge;
  }

  void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
    vec2 size = vec2(textureSize(colorTexture, 0));
    float depth = readDepth( depthTexture, vUv );


    float edgeThickness = clamp((1. - depth),  .5, thickness);
    float normalEdge = length(sobel(normalTexture, vUv, size, edgeThickness));
    normalEdge = 1. - aastep(.5, normalEdge);
    float depthEdge = length(sobelDepth( depthTexture, vUv, size, edgeThickness )) * 2.;
    depthEdge = 1. - aastep(.5, depthEdge);

    float colorEdge = length(sobel(colorTexture, vUv, size, 1.)) * .73;
    colorEdge = 1. - aastep(.5, colorEdge);

    vec3 edgeColor = vec3( min(normalEdge, depthEdge) );
    edgeColor = min(edgeColor, colorEdge);

    outputColor = texture(colorTexture, vUv);

    //comment out for no dithering
    // if (luma(outputColor.rgba) < .37) {
    //   outputColor.rgb = blendDarken(outputColor.rgb, vec3(dither8x8(gl_FragCoord.xy, texture(colorTexture, vUv).rgb)), .75);
    // }

    outputColor.rgb = blendDarken(outputColor.rgb, vec3(edgeColor), 1.);
  }
`;
//TODO: refactor this based on https://codesandbox.io/s/volumetric-light-w633u
class OutlinesAndHatchingEffect extends Effect {
	constructor(scene, camera) {
		super("OutlinesAndHatchingEffect", fragmentShader, {
			uniforms: new Map([
				["colorTexture", new Uniform(null)],
				["normalTexture", new Uniform(null)],
				["depthTexture", new Uniform(null)],
				["scale", new Uniform(1)],
				["thickness", new Uniform(1)],
				["angle", new Uniform(2)],
        ["cameraNear",new Uniform(camera.near)],
        ["cameraFar",new Uniform(camera.far )],
			])
		});

		this.colorPass = new RenderPass(scene, camera);
		this.normalPass = new NormalPass(scene, camera);
		this.normalPass.depthBuffer = false;

		this.renderTarget = new WebGLRenderTarget(1, 1);
		this.renderTarget.texture.format = RGBAFormat;
		this.renderTarget.texture.type = HalfFloatType;
		this.renderTarget.texture.minFilter = NearestFilter;
		this.renderTarget.texture.magFilter = NearestFilter;
		this.renderTarget.texture.generateMipmaps = false;
    this.renderTarget.depthBuffer = true;
    this.renderTarget.depthTexture = new DepthTexture();
		this.renderTarget.depthTexture.format = DepthFormat;
		this.renderTarget.depthTexture.type = UnsignedIntType;

		this.uniforms.get("normalTexture").value = this.normalPass.texture;
		this.uniforms.get("depthTexture").value = this.renderTarget.depthTexture;
		this.uniforms.get("colorTexture").value = this.renderTarget.texture;
	}

	setSize(w, h) {
		this.colorPass.setSize(w, h);
		this.normalPass.setSize(w, h);
		this.renderTarget.setSize(w, h);
	}

	update(renderer) {
		this.normalPass.render(renderer, null, this.renderTarget);
		this.colorPass.render(renderer, this.renderTarget, this.renderTarget);
	}
}

const PostEffect = forwardRef((_, ref) => {
	const { scene, camera } = useThree(({scene, camera}) => {
    scene.background = new Color('#89bff5');
    return {scene, camera}
  });

	const effect = useMemo(
		() => new OutlinesAndHatchingEffect(scene, camera),
		[],
	);
	return <primitive ref={ref} object={effect} />;
});

export default PostEffect;
