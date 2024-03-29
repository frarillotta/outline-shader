import { Canvas } from "@react-three/fiber";
import { Suspense, useRef, useState, useLayoutEffect } from "react";
import { OrbitControls, Stats } from "@react-three/drei";
import { BufferAttribute, Vector3, Color, UniformsLib, Vector2 } from "three";
import { EffectComposer } from "@react-three/postprocessing";
import OutlinesAndHatchingEffect from "./post/OutlinesAndHatchingEffect";
import { SimplexNoise } from "three/examples/jsm/math/SimplexNoise";
import { Vagrant } from "./Vagrant";
import { StateContextProvider } from "./StateContext";

const Ground = () => {
	const groundRef = useRef();
	const heightfieldRef = useRef([]);
	useLayoutEffect(() => {
		const simplexNoise = new SimplexNoise();
		const positions = new Float32Array(
			groundRef.current.geometry.attributes.position.array,
		);
		for (
			let i = 2;
			i < groundRef.current.geometry.attributes.position.count * 3;
			i += 3
		) {
			const xypos = new Vector2(positions.at(i - 2), positions.at(i - 1));
			const dist = xypos.distanceTo(new Vector2(0, 0));
			const height =
				simplexNoise.noise(
					positions.at(i - 2) / 500,
					positions.at(i - 1) / 500,
					// ) * 17;
				) * (dist) ** 0.65;
			heightfieldRef.current.push(height);
			positions[i] = height;
		}
		groundRef.current.geometry.setAttribute(
			"position",
			new BufferAttribute(positions, 3),
		); // Create the Three.js BufferAttribute and specify that each information is composed of 3 values
		groundRef.current.geometry.computeVertexNormals();
	}, []);
	return (
		<mesh
			receiveShadow={true}
			castShadow
			rotation={[Math.PI / 2, Math.PI, 0]}
			position={[0, -2, 0]}
			ref={groundRef}
		>
			<planeGeometry args={[2000, 2000, 750, 750]} />
			{/* this might not be terrible with rim lights */}
			<meshStandardMaterial color={"#415d86"} />
		</mesh>
	);
};

const toonVertexShader = `

#include <common>
#include <shadowmap_pars_vertex>
	varying vec3 vNormal;
	varying vec3 vViewDir;

	void main() {
		
		#include <beginnormal_vertex>
		#include <defaultnormal_vertex>
	
		#include <begin_vertex>
	
		#include <worldpos_vertex>
		#include <shadowmap_vertex>
		vec4 modelPosition = modelMatrix * vec4(position, 1.0);
		vec4 viewPosition = viewMatrix * modelPosition;
		vec4 clipPosition = projectionMatrix * viewPosition;
		vNormal = normalize(normalMatrix * normal);
		vViewDir = normalize(-viewPosition.xyz);
		gl_Position = clipPosition;
	}
`;

const toonFragmentShader = `
#include <common>
#include <packing>
#include <lights_pars_begin>
#include <shadowmap_pars_fragment>
#include <shadowmask_pars_fragment>

uniform vec3 uColor;
uniform float uGlossiness;

varying vec3 vNormal;
varying vec3 vViewDir;

void main() {

	DirectionalLightShadow directionalShadow = directionalLightShadows[0];

	float shadow = getShadow(
		directionalShadowMap[0],
		directionalShadow.shadowMapSize,
		directionalShadow.shadowBias,
		directionalShadow.shadowRadius,
		vDirectionalShadowCoord[0]
	);
	float NdotL = dot(vNormal, directionalLights[0].direction);
	float lightIntensity = smoothstep(0.0, 0.01, NdotL);
	vec3 directionalLight = directionalLights[0].color * lightIntensity;

	vec3 halfVector = normalize(directionalLights[0].direction + vViewDir);
	float NdotH = dot(vNormal, halfVector);

	float specularIntensity = pow(NdotH * lightIntensity, 1000. / uGlossiness);
	float speculatIntensitySmooth = smoothstep(0.05, 0.1, specularIntensity);

	vec3 specular = speculatIntensitySmooth * directionalLights[0].color;

	float rimDot = 1. - dot(vViewDir, vNormal);
	float rimAmount = 0.6;

	float rimThreshold = .2;
	float rimIntensity = rimDot * pow(NdotL, rimThreshold);
	rimIntensity = smoothstep(rimAmount - .01, rimAmount + .01, rimIntensity);

	vec3 rim = rimIntensity * directionalLights[0].color;
	gl_FragColor = vec4(uColor * (ambientLightColor + directionalLight + specular + rim), 1.0);

}
`;

const CustomToonShaderMaterial = () => {
	return (
		<shaderMaterial
			vertexShader={toonVertexShader}
			fragmentShader={toonFragmentShader}
			uniforms={{
				...UniformsLib.lights,
				uColor: { value: new Color("#6495ED") },
				uGlossiness: { value: 4 },
			}}
			lights={true}
		/>
	);
};

const ToonShaderWithRimLights = ({ color }) => (
	<meshToonMaterial
		color={color}
		onBeforeCompile={(shader) => {
			shader.fragmentShader = shader.fragmentShader.replace(
				"#include <dithering_fragment>",
				`
			  #include <dithering_fragment>
			  float rimLightIntensity = dot(normalize(vViewPosition), vNormal);
			  float fresnel = pow(dot(vNormal, normalize(vViewPosition)), .4);
			  fresnel = saturate(1. - fresnel);
			  gl_FragColor.rgb += vec3(fresnel);
			`,
			);
		}}
	/>
);

// softShadows();

const Scene = () => {
	return (
		<>
			<StateContextProvider>
				<Ground />
				<Vagrant scale={2} position={[0, 17, -10]} />
				{/* <mesh position={[0, 20, -10]}>
					<sphereGeometry args={[1]}/>
					<CustomToonShaderMaterial />
				</mesh> */}
			</StateContextProvider>
		</>
	);
};

export default function App() {
	const [isEffectsOn, toggleEffects] = useState(true);
	return (
		<>
			{/* <button
				onClick={() => {
					toggleEffects(!isEffectsOn);
				}}
				style={{
					float: "right",
				}}
			>
				Effects {isEffectsOn ? "off" : "on"}
			</button> */}
			<Canvas
				camera={{ near: 0.1, far: 3000, fov: 45, position: [-15, 25, 10] }}
				shadows={true}
				dpr={1}
			>
			<fog attach="fog" args={['#1352bf', 1, 200]} />
				<Stats />
				<OrbitControls target={new Vector3(0, 20, -10)} />
				{/* <fog attach="fog" args={["white", 0.1, 1500]} /> */}
				{/* <ambientLight intensity={0.4} /> */}
				<directionalLight
					castShadow
					color={"#c0d7d9"}
					position={[2.5, 20, 25]}
					intensity={0.7}
					shadow-mapSize-width={2048}
					shadow-mapSize-height={2048}
					shadow-camera-far={2000}
					shadow-camera-left={-30}
					shadow-camera-right={30}
					shadow-camera-top={30}
					shadow-camera-bottom={-30}
				/>
				<pointLight position={[0, -10, 0]} intensity={1} />
				<Suspense fallback={null}>
					{isEffectsOn && <PostEffects />}
					<Scene />
				</Suspense>
			</Canvas>
		</>
	);
}

const PostEffects = () => {
	return (
		<EffectComposer>
			<OutlinesAndHatchingEffect />
		</EffectComposer>
	);
};
