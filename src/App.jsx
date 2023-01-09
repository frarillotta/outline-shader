import { Canvas } from "@react-three/fiber";
import { Suspense, useRef, useState, useLayoutEffect } from "react";
import { OrbitControls } from "@react-three/drei";
import { BufferAttribute, Vector3 } from "three";
import { EffectComposer } from "@react-three/postprocessing";
import OutlinesAndHatchingEffect from "./post/OutlinesAndHatchingEffect";
import { SimplexNoise } from "three/examples/jsm/math/SimplexNoise";
import { Vagrant } from "./Vagrant";

const Ground = () => {

	const groundRef = useRef();
	const heightfieldRef = useRef([]);
	useLayoutEffect(() => {
		const simplexNoise = new SimplexNoise();
		const positions = new Float32Array(groundRef.current.geometry.attributes.position.array);
		for(let i = 2; i < groundRef.current.geometry.attributes.position.count * 3; i+=3)	{
			const height = simplexNoise.noise(positions.at(i - 2)  / 150, positions.at(i - 1)  / 150) * 17;
			heightfieldRef.current.push(height);
			positions[i] = height;
		}
		groundRef.current.geometry.setAttribute('position', new BufferAttribute(positions, 3)) // Create the Three.js BufferAttribute and specify that each information is composed of 3 values
		groundRef.current.geometry.computeVertexNormals()
	}, [])
	return (
		<mesh
			receiveShadow={true}
			castShadow
			rotation={[Math.PI / 2, Math.PI, 0]}
			position={[0, -2, 0]}
			ref={groundRef}
		>
			<planeGeometry args={[1200, 1200, 600, 600]} />
			{/* this might not be terrible with rim lights */}
			<meshStandardMaterial color={"#415d86"} />

		</mesh>
	);
};

const ToonShaderWithRimLights = ({ color }) => (
	<meshToonMaterial
		color={color}
		onBeforeCompile={(shader) => {
			shader.fragmentShader = shader.fragmentShader.replace(
			  '#include <dithering_fragment>', `
			  #include <dithering_fragment>
			  float rimLightIntensity = dot(normalize(vViewPosition), vNormal);
			  float fresnel = pow(dot(vNormal, normalize(vViewPosition)), .4);
			  fresnel = saturate(1. - fresnel);
			  gl_FragColor.rgb += vec3(fresnel);
			`)
		}}
	/>
);

// softShadows();


const TestScene = () => {
	return (
		<>
			<Ground />
			<Vagrant scale={2} position={[0, 17, -10]}/>

		</>
	);
};

export default function App() {
	const [isEffectsOn, toggleEffects] = useState(true);
	return (
		<>
			<button
				onClick={() => {
					toggleEffects(!isEffectsOn);
				}}
			>
				Effects {isEffectsOn ? "off" : "on"}
			</button>
			<Canvas
				camera={{ near: 0.1, far: 900, fov: 45, position: [-15, 25, 10]}}
				shadows={true}
				dpr={1}
			>
				{/* <Stats /> */}
				<OrbitControls  target={new Vector3(0, 20, -10)}/>
				{/* <fog attach="fog" args={["white", 0.1, 1500]} /> */}
				{/* <ambientLight intensity={0.4} /> */}
				<directionalLight
					castShadow
					color={'#c0d7d9'}
					position={[2.5, 8, 5]}
					intensity={0.7}
					shadow-mapSize-width={2048}
					shadow-mapSize-height={2048}
					shadow-camera-far={50}
					shadow-camera-left={-10}
					shadow-camera-right={10}
					shadow-camera-top={10}
					shadow-camera-bottom={-10}
				/>
				<pointLight position={[0, -10, 0]} intensity={1} />
				<Suspense fallback={null}>
					{isEffectsOn && <PostEffects />}
					<TestScene />
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
