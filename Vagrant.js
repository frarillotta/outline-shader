/*
Auto-generated by: https://github.com/pmndrs/gltfjsx
*/

import React, { useRef } from 'react'
import { useGLTF } from '@react-three/drei'

export function Model(props) {
  const { nodes, materials } = useGLTF('/vagrant.glb')
  return (
    <group {...props} dispose={null}>
      <group position={[0.67, 0.55, 0.45]} scale={[2.58, 2.08, 2.08]}>
        <primitive object={nodes.spine} />
        <group position={[0, -0.01, 0]} rotation={[Math.PI / 2, 0, 0]} scale={[0.39, 0.48, 0.48]}>
          <mesh geometry={nodes.Sphere002_1.geometry} material={materials.eyes} />
          <mesh geometry={nodes.Sphere002_2.geometry} material={materials.mask} />
          <mesh geometry={nodes.Sphere002_3.geometry} material={materials.hood} />
          <mesh geometry={nodes.Sphere002_4.geometry} material={materials.pants} />
          <mesh geometry={nodes.Sphere002_5.geometry} material={materials.shirt} />
          <mesh geometry={nodes.Sphere002_6.geometry} material={materials.bracelents} />
          <mesh geometry={nodes.Sphere002_7.geometry} material={materials.shoes} />
          <mesh geometry={nodes.Sphere002_8.geometry} material={materials.sole} />
          <mesh geometry={nodes.Sphere002_9.geometry} material={materials.gloves} />
          <mesh geometry={nodes.Sphere002_10.geometry} material={materials.shawl} />
        </group>
      </group>
      <mesh geometry={nodes.Cube.geometry} material={materials.rust} position={[0.19, -1.63, -1.34]} rotation={[0, 0.12, 0]} scale={[4.83, 0.15, 1]} />
      <mesh geometry={nodes.Cylinder.geometry} material={nodes.Cylinder.material} position={[0.12, 2.38, 5.87]} />
      <mesh geometry={nodes.Plane_1.geometry} material={materials['upper hood']} />
      <mesh geometry={nodes.Plane_2.geometry} material={materials['lower hood']} />
    </group>
  )
}

useGLTF.preload('/vagrant.glb')