
import { useFrame } from "@react-three/fiber";
import { Billboard } from "@react-three/drei";
import {shaderV2 as orthoVS} from './post/shaders/ortho-vs';
import { useRef } from "react";

const fireBillboardUniforms = {
	time: {
		value: 0
	},
}
export const Fire = (props) => {

	const fragmentShader = `
		precision highp float;
	
		uniform float time;
		varying vec2 vUv;
	
		float rand(float n){return fract(sin(n) * 43758.5453123);}
		
		float noise(float p){
		float fl = floor(p);
		float fc = fract(p);
		return mix(rand(fl), rand(fl + 1.0), fc);
		}
		float rand(vec2 n) { 
		return fract(sin(dot(n, vec2(12.9898, 4.1414))) * 43758.5453);
		}
		
		float noise(vec2 p){
		vec2 ip = floor(p);
		vec2 u = fract(p);
		u = u*u*(3.0-2.0*u);
		
		float res = mix(
			mix(rand(ip),rand(ip+vec2(1.0,0.0)),u.x),
			mix(rand(ip+vec2(0.0,1.0)),rand(ip+vec2(1.0,1.0)),u.x),u.y);
		return res*res;
		}
		#define NUM_OCTAVES 4
	
		float fbm(float x) {
		float v = 0.0;
		float a = 0.5;
		float shift = float(100);
		for (int i = 0; i < NUM_OCTAVES; ++i) {
			v += a * noise(x);
			x = x * 2.0 + shift;
			a *= 0.5;
		}
		return v;
		}
		
		
		float fbm(vec2 x) {
		float v = 0.0;
		float a = 0.5;
		vec2 shift = vec2(100);
		// Rotate to reduce axial bias
			mat2 rot = mat2(cos(0.5), sin(0.5), -sin(0.5), cos(0.50));
		for (int i = 0; i < NUM_OCTAVES; ++i) {
			v += a * noise(x);
			x = rot * x * 2.0 + shift;
			a *= 0.5;
		}
		return v;
		}
		
		
		void main() {
			gl_FragColor.a = .9;
			vec2 lUv = vUv;
		
			lUv.y -= time / 2.5;
			float fbmNoise = fbm(lUv * 5.) * 1.25;
			float dist = distance(vec2(vUv.x, vUv.y), vec2(.5, 0.));
			dist *= distance(vUv, vec2(.5, .5)) / 2.;
			dist *= 9.5;
		
			float firstFlame = step(dist, fbmNoise);
			dist -= .25;
			float secondFlame = step(dist, fbmNoise) - firstFlame;
			dist -= .25;
			float thirdFlame = step(dist, fbmNoise) - secondFlame;
			
			vec3 finalColor = mix(
				vec3(0.), 
				vec3(1., .0, 0.01),
				thirdFlame
			);
			finalColor = mix(
				finalColor,
				vec3(1., .25, 0.01),
				secondFlame
			);
			finalColor = mix(
				finalColor,
				vec3(1., .75, 0.01),
				firstFlame
			);
			gl_FragColor.rgb = vec3(
				finalColor
			);
			if (gl_FragColor.rgb == vec3(0.)) {
				discard;
			}
		}
	`;
	const ref = useRef();

	useFrame(({clock}) => {
		fireBillboardUniforms.time.value = clock.elapsedTime
	})

	return <group {...props}>
		<pointLight 
            castShadow 
            position={[0, 0, 0]} 
            args={['red', 20, 30, 3]}
            shadow-mapSize-width={2048}
            shadow-mapSize-height={2048}
            shadow-camera-far={10}
            shadow-bias={-0.009}
            shadow-camera-left={-5}
            shadow-camera-right={5}
            shadow-camera-top={5}
            shadow-camera-bottom={-5}
            
        />
		{/* <mesh receiveShadow castShadow position={[-1.4, -0.7, -4]}>
			<sphereBufferGeometry args={[0.4]} />
			<meshBasicMaterial color="white" />
		</mesh> */}
		<Billboard  >
			<mesh layers={1} ref={ref}  scale={[2, 4, 2]}>
				<planeGeometry computeVertexNormals={false} args={[1, 1]} />
				<shaderMaterial transparent={true} uniforms={fireBillboardUniforms} fragmentShader={fragmentShader} vertexShader={orthoVS}/>
			</mesh>
		</Billboard>
	</group>

}
