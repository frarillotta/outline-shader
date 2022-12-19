import { Canvas, useThree, useFrame } from "@react-three/fiber";
import { Suspense, useRef, useState } from "react";
import { Stats, OrbitControls, softShadows } from "@react-three/drei";
import { Color, MeshToonMaterial } from "three";
import { EffectComposer } from "@react-three/postprocessing";
import OutlinesAndHatchingEffect from "./post/OutlinesAndHatchingEffect";
import { Room } from "./Room";
import { ToonShader2 } from 'three/examples/jsm/shaders/ToonShader'
let AIRSHIPS_COUNT = 30;

if (window.innerWidth < 500) {
	AIRSHIPS_COUNT = 20;
}

const ToonShaderWithRimLights = ({color}) => <meshToonMaterial 
  color={color}
  onBeforeCompile={(shader) => {

    // shader.fragmentShader = shader.fragmentShader.replace(
    //   '#include <dithering_fragment>', `
      
    //   #include <dithering_fragment>

    //   float rimLightIntensity = dot(normalize(vViewPosition), vNormal);
      
    //   float fresnel = pow(dot(vNormal, normalize(vViewPosition)), .4);
    //   fresnel = saturate(1. - fresnel);

    //   gl_FragColor.rgb += vec3(fresnel);
    // `)

  }}
/>

// softShadows();
const Sphere = () => {
	const sphereRef = useRef();

	useFrame(({ clock }) => {
		sphereRef.current.position.y = Math.sin(clock.elapsedTime);
		sphereRef.current.rotation.y = Math.cos(clock.elapsedTime);
	});

	return (
		<mesh castShadow={true} receiveShadow={true} ref={sphereRef}>
			<icosahedronGeometry args={[1, 0]} />
			<meshStandardMaterial
				color={"red"}
			/>
		</mesh>
	);
};

const TestScene = () => {
	return (
		<>
			<mesh
				receiveShadow={true}
				rotation={[Math.PI / 2, Math.PI, 0]}
				position={[0, -2, 0]}
			>
				<planeGeometry args={[20, 20]} />
				<meshStandardMaterial color={"grey"} />
			</mesh>
			<mesh castShadow receiveShadow position={[0, 0, 4]}>
				<boxGeometry args={[3, 3, 3, 3]} />
				<meshToonMaterial color={"hotpink"} />
			</mesh>
			<mesh castShadow receiveShadow position={[-4, 0, -2]}>
				<torusKnotGeometry args={[1, 0.3, 64, 16]} />
				<ToonShaderWithRimLights 
          color={'blue'}
        />
			</mesh>

			<mesh castShadow receiveShadow position={[4, 0, -2]}>
				<sphereGeometry args={[1]} />
				<ToonShaderWithRimLights color="blue" />
			</mesh>
			<Sphere />
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
				Effects {isEffectsOn ? 'off' : 'on'}
			</button>
			<Canvas
				camera={{ near: 0.1, far: 50, fov: 26, position: [15, 10, -15] }}
				shadows={true}
				dpr={1}
			>
				{/* <Stats /> */}
				<OrbitControls />
				{/* <fog attach="fog" args={["white", 0, 40]} /> */}
				<ambientLight intensity={0.4} />
				<directionalLight
					castShadow
					position={[2.5, 8, 5]}
					intensity={1}
					shadow-mapSize-width={2048}
					shadow-mapSize-height={2048}
					shadow-camera-far={50}
					shadow-camera-left={-10}
					shadow-camera-right={10}
					shadow-camera-top={10}
					shadow-camera-bottom={-10}
				/>
				<pointLight
					castShadow
					position={[-10, 10, -20]}
					color="orange"
					intensity={2}
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
          			{/* <Room /> */}
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
