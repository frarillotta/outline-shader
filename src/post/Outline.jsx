import * as THREE from "three";
import { Pass } from "three/examples/jsm/postprocessing/Pass.js";
import { FullScreenQuad } from "three/examples/jsm/postprocessing/Pass.js";
import React, { forwardRef, useMemo } from "react";
import { useThree } from "@react-three/fiber";

/*
  This class computes "surface IDs" for a given mesh.

  A "surface" is defined as a set of triangles that share vertices.
  
  Inspired by Ian MacLarty, see:
    https://twitter.com/ianmaclarty/status/1499494878908403712
*/
class FindSurfaces {
  constructor() {
    // This identifier, must be globally unique for each surface
    // across all geometry rendered on screen
    this.surfaceId = 0;
  }

  /*
   * Returns the surface Ids as a Float32Array that can be inserted as a vertex attribute
   */
  getSurfaceIdAttribute(mesh) {
    const bufferGeometry = mesh.geometry;
    const numVertices = bufferGeometry.attributes.position.count;
    const vertexIdToSurfaceId = this._generateSurfaceIds(mesh);

    const colors = [];
    for (let i = 0; i < numVertices; i++) {
      const vertexId = i;
      let surfaceId = vertexIdToSurfaceId[vertexId];

      colors.push(surfaceId, 0, 0, 1);
    }

    const colorsTypedArray = new Float32Array(colors);
    return colorsTypedArray;
  }

  /*
   * Returns a `vertexIdToSurfaceId` map
   * given a vertex, returns the surfaceId
   */
  _generateSurfaceIds(mesh) {
    const bufferGeometry = mesh.geometry;
    const numVertices = bufferGeometry.attributes.position.count;
    const numIndices = bufferGeometry.index.count;
    const indexBuffer = bufferGeometry.index.array;
    const vertexBuffer = bufferGeometry.attributes.position.array;
    // For each vertex, search all its neighbors
    const vertexMap = {};
    for (let i = 0; i < numIndices; i += 3) {
      const i1 = indexBuffer[i + 0];
      const i2 = indexBuffer[i + 1];
      const i3 = indexBuffer[i + 2];

      add(i1, i2);
      add(i1, i3);
      add(i2, i3);
    }
    function add(a, b) {
      if (vertexMap[a] == undefined) vertexMap[a] = [];
      if (vertexMap[b] == undefined) vertexMap[b] = [];

      if (vertexMap[a].indexOf(b) == -1) vertexMap[a].push(b);
      if (vertexMap[b].indexOf(a) == -1) vertexMap[b].push(a);
    }

    // Find cycles
    const frontierNodes = Object.keys(vertexMap).map((v) => Number(v));
    const exploredNodes = {};
    const vertexIdToSurfaceId = {};

    while (frontierNodes.length > 0) {
      const node = frontierNodes.pop();
      if (exploredNodes[node]) continue;

      // Get all neighbors recursively
      const surfaceVertices = getNeighborsNonRecursive(node);
      // Mark them as explored
      for (let v of surfaceVertices) {
        exploredNodes[v] = true;
        vertexIdToSurfaceId[v] = this.surfaceId;
      }

      this.surfaceId += 1;
    }
    function getNeighbors(node, explored) {
      const neighbors = vertexMap[node];
      let result = [node];
      explored[node] = true;

      for (let n of neighbors) {
        if (explored[n]) continue;
        explored[n] = true;
        const newNeighbors = getNeighbors(n, explored);
        result = result.concat(newNeighbors);
      }

      return result;
    }

    function getNeighborsNonRecursive(node) {
      const frontier = [node];
      const explored = {};
      const result = [];

      while (frontier.length > 0) {
        const currentNode = frontier.pop();
        if (explored[currentNode]) continue;
        const neighbors = vertexMap[currentNode];
        result.push(currentNode);

        explored[currentNode] = true;

        for (let n of neighbors) {
          if (!explored[n]) {
            frontier.push(n);
          }
        }
      }

      return result;
    }

    return vertexIdToSurfaceId;
  }
}

export function getSurfaceIdMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: {
      maxSurfaceId: { value: 1 },
    },
    vertexShader: getVertexShader(),
    fragmentShader: getFragmentShader(),
    vertexColors: true,
  });
}

function getVertexShader() {
  return `
  varying vec2 v_uv;
  varying vec4 vColor;

  void main() {
     v_uv = uv;
     vColor = color;

     gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
  `;
}

function getFragmentShader() {
  return `
  varying vec2 v_uv;
  varying vec4 vColor;
  uniform float maxSurfaceId;

  void main() {
    // Normalize the surfaceId when writing to texture
    // Surface ID needs rounding as precision can be lost in perspective correct interpolation 
    // - see https://github.com/OmarShehata/webgl-outlines/issues/9 for other solutions eg. flat interpolation.
    float surfaceId = round(vColor.r) / maxSurfaceId;
    gl_FragColor = vec4(surfaceId, 0.0, 0.0, 1.0);
  }
  `;
}

// Follows the structure of
// 		https://github.com/mrdoob/three.js/blob/master/examples/jsm/postprocessing/OutlinePass.js
class CustomOutlinePass extends Pass {
  constructor(resolution, scene, camera) {
    super();

    this.renderScene = scene;
    this.renderCamera = camera;
    this.resolution = new THREE.Vector2(resolution.x, resolution.y);

    this.fsQuad = new FullScreenQuad(null);
    this.fsQuad.material = this.createOutlinePostProcessMaterial();

    // Create a buffer to store the normals of the scene onto
    // or store the "surface IDs"
    const surfaceBuffer = new THREE.WebGLRenderTarget(
      this.resolution.x,
      this.resolution.y
    );
    surfaceBuffer.texture.format = THREE.RGBAFormat;
    surfaceBuffer.texture.type = THREE.HalfFloatType;
    surfaceBuffer.texture.minFilter = THREE.NearestFilter;
    surfaceBuffer.texture.magFilter = THREE.NearestFilter;
    surfaceBuffer.texture.generateMipmaps = false;
    surfaceBuffer.stencilBuffer = false;
    this.surfaceBuffer = surfaceBuffer;

    this.normalOverrideMaterial = new THREE.MeshNormalMaterial();
    this.surfaceIdOverrideMaterial = getSurfaceIdMaterial();
  }

  dispose() {
    this.surfaceBuffer.dispose();
    this.fsQuad.dispose();
  }

  updateMaxSurfaceId(maxSurfaceId) {
    this.surfaceIdOverrideMaterial.uniforms.maxSurfaceId.value = maxSurfaceId;
  }

  setSize(width, height) {
    this.surfaceBuffer.setSize(width, height);
    this.resolution.set(width, height);

    this.fsQuad.material.uniforms.screenSize.value.set(
      this.resolution.x,
      this.resolution.y,
      1 / this.resolution.x,
      1 / this.resolution.y
    );
  }

  render(renderer, writeBuffer, readBuffer) {
    // Turn off writing to the depth buffer
    // because we need to read from it in the subsequent passes.
    const depthBufferValue = writeBuffer.depthBuffer;
    writeBuffer.depthBuffer = false;

    // 1. Re-render the scene to capture all suface IDs in a texture.
    renderer.setRenderTarget(this.surfaceBuffer);
    const overrideMaterialValue = this.renderScene.overrideMaterial;

    this.renderScene.overrideMaterial = this.surfaceIdOverrideMaterial;
    renderer.render(this.renderScene, this.renderCamera);
    this.renderScene.overrideMaterial = overrideMaterialValue;

    this.fsQuad.material.uniforms["depthBuffer"].value =
      readBuffer.depthTexture;
    this.fsQuad.material.uniforms["surfaceBuffer"].value =
      this.surfaceBuffer.texture;
    this.fsQuad.material.uniforms["sceneColorBuffer"].value =
      readBuffer.texture;

    // 2. Draw the outlines using the depth texture and normal texture
    // and combine it with the scene color
    if (this.renderToScreen) {
      // If this is the last effect, then renderToScreen is true.
      // So we should render to the screen by setting target null
      // Otherwise, just render into the writeBuffer that the next effect will use as its read buffer.
      renderer.setRenderTarget(null);
      this.fsQuad.render(renderer);
    } else {
      renderer.setRenderTarget(writeBuffer);
      this.fsQuad.render(renderer);
    }

    // Reset the depthBuffer value so we continue writing to it in the next render.
    writeBuffer.depthBuffer = depthBufferValue;
  }

  get vertexShader() {
    return `
			varying vec2 vUv;
			void main() {
				vUv = uv;
				gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
			}
			`;
  }
  get fragmentShader() {
    return `
			#include <packing>
			// The above include imports "perspectiveDepthToViewZ"
			// and other GLSL functions from ThreeJS we need for reading depth.
			uniform sampler2D sceneColorBuffer;
			uniform sampler2D depthBuffer;
			uniform sampler2D surfaceBuffer;
			uniform float cameraNear;
			uniform float cameraFar;
			uniform vec4 screenSize;
			uniform vec3 outlineColor;
			uniform vec2 multiplierParameters;

			varying vec2 vUv;

			// Helper functions for reading from depth buffer.
			float readDepth (sampler2D depthSampler, vec2 coord) {
				float fragCoordZ = texture2D(depthSampler, coord).x;
				float viewZ = perspectiveDepthToViewZ( fragCoordZ, cameraNear, cameraFar );
				return viewZToOrthographicDepth( viewZ, cameraNear, cameraFar );
			}
			float getLinearDepth(vec3 pos) {
				return -(viewMatrix * vec4(pos, 1.0)).z;
			}

			float getLinearScreenDepth(sampler2D map) {
					vec2 uv = gl_FragCoord.xy * screenSize.zw;
					return readDepth(map,uv);
			}
			// Helper functions for reading normals and depth of neighboring pixels.
			float getPixelDepth(int x, int y) {
				// screenSize.zw is pixel size 
				// vUv is current position
				return readDepth(depthBuffer, vUv + screenSize.zw * vec2(x, y));
			}
			// "surface value" is either the normal or the "surfaceID"
			vec3 getSurfaceValue(int x, int y) {
				vec3 val = texture2D(surfaceBuffer, vUv + screenSize.zw * vec2(x, y)).rgb;
				return val;
			}

			float saturateValue(float num) {
				return clamp(num, 0.0, 1.0);
			}

			float getSufaceIdDiff(vec3 surfaceValue) {
				float surfaceIdDiff = 0.0;
				surfaceIdDiff += distance(surfaceValue, getSurfaceValue(1, 0));
				surfaceIdDiff += distance(surfaceValue, getSurfaceValue(0, 1));
				surfaceIdDiff += distance(surfaceValue, getSurfaceValue(0, 1));
				surfaceIdDiff += distance(surfaceValue, getSurfaceValue(0, -1));

				surfaceIdDiff += distance(surfaceValue, getSurfaceValue(1, 1));
				surfaceIdDiff += distance(surfaceValue, getSurfaceValue(1, -1));
				surfaceIdDiff += distance(surfaceValue, getSurfaceValue(-1, 1));
				surfaceIdDiff += distance(surfaceValue, getSurfaceValue(-1, -1));
				return surfaceIdDiff;
			}

			void main() {
				vec4 sceneColor = texture2D(sceneColorBuffer, vUv);
				float depth = getPixelDepth(0, 0);
				vec3 surfaceValue = getSurfaceValue(0, 0);

				// Get the difference between depth of neighboring pixels and current.
				float depthDiff = 0.0;
				depthDiff += abs(depth - getPixelDepth(1, 0));
				depthDiff += abs(depth - getPixelDepth(-1, 0));
				depthDiff += abs(depth - getPixelDepth(0, 1));
				depthDiff += abs(depth - getPixelDepth(0, -1));

				// Get the difference between surface values of neighboring pixels
				// and current
				float surfaceValueDiff = getSufaceIdDiff(surfaceValue);
				
				// Apply multiplier & bias to each 
				float depthBias = multiplierParameters.x;
				float depthMultiplier = multiplierParameters.y;

				depthDiff = depthDiff * depthMultiplier;
				depthDiff = saturateValue(depthDiff);
				depthDiff = pow(depthDiff, depthBias);

				if (surfaceValueDiff != 0.0) surfaceValueDiff = 1.0;

				float outline = saturateValue(surfaceValueDiff + depthDiff);
			
				// Combine outline with scene color.
				vec4 outlineColor = vec4(outlineColor, 1.0);
				gl_FragColor = vec4(mix(sceneColor, outlineColor, outline));
			}
			`;
  }

  createOutlinePostProcessMaterial() {
    return new THREE.ShaderMaterial({
      uniforms: {
        sceneColorBuffer: {},
        depthBuffer: {},
        surfaceBuffer: {},
        outlineColor: { value: new THREE.Color(0xffffff) },
        //4 scalar values packed in one uniform:
        //  depth multiplier, depth bias
        multiplierParameters: {
          value: new THREE.Vector2(0.9, 20),
        },
        cameraNear: { value: this.renderCamera.near },
        cameraFar: { value: this.renderCamera.far },
        screenSize: {
          value: new THREE.Vector4(
            this.resolution.x,
            this.resolution.y,
            1 / this.resolution.x,
            1 / this.resolution.y
          ),
        },
      },
      vertexShader: this.vertexShader,
      fragmentShader: this.fragmentShader,
    });
  }
}


const PostEffect = forwardRef((_, ref) => {
	const { scene, camera } = useThree();

	const effect = useMemo(
		() => new CustomOutlinePass(new THREE.Vector2(window.innerWidth, window.innerHeight), scene, camera),
		[],
	);
	return <primitive ref={ref} object={effect} />;
});

export default PostEffect;
