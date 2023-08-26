import { useFrame } from "@react-three/fiber";
import { createContext, useContext, useState } from "react";
import { Vector3 } from "three";

const StateContext = createContext();

export const useStateContext = () => {
	const value = useContext(StateContext);

	return value;
};

export const StateContextProvider = ({ children }) => {
	const [stateContextState, setStateContext] = useState({
		movingTowards: null,
	});

	// useFrame(({ camera }) => {
	// 	if (stateContextState.movingTowards) {
	// 		camera.position.lerp(stateContextState.movingTowards, 0.05);
	// 		if (camera.position.equals(stateContextState.movingTowards)) {
	// 			setStateContext({ ...stateContextState, movingTowards: null });
	// 		}
	// 	}
	// });

	return (
		<StateContext.Provider
			value={{ stateContext: stateContextState, setStateContext }}
		>
			{children}
		</StateContext.Provider>
	);
};
