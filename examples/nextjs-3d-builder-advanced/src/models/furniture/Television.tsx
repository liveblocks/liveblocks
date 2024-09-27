import React, { ComponentProps, forwardRef, Ref } from "react";
import { useGLTF, useVideoTexture } from "@react-three/drei";
import { FurnitureModels } from "./types";
import { Group } from "three";

export const Television = forwardRef(
  (props: ComponentProps<"group">, ref: Ref<Group>) => {
    const texture = useVideoTexture("/screen-bbq.mp4");
    const { nodes, materials } = useGLTF("/furniture.glb") as FurnitureModels;

    return (
      <group {...props} ref={ref} dispose={null}>
        <mesh
          castShadow
          receiveShadow
          geometry={nodes.television.geometry}
          material={materials.televisionMetalDark}
          position={[0, 0.585, 0]}
          rotation={[Math.PI / 2, 0, 0]}
        />
        <group position={[0, 0.374, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <mesh
            castShadow
            receiveShadow
            geometry={nodes.televisionCabinet_1.geometry}
            material={materials.televisionWood}
          />
          <mesh
            castShadow
            receiveShadow
            geometry={nodes.televisionCabinet_2.geometry}
            material={materials.televisionMetal}
          />
        </group>
        <mesh
          castShadow
          receiveShadow
          geometry={nodes.televisionScreen.geometry}
          position={[0, 1.149, -0.046]}
          rotation={[Math.PI / 2, 0, -Math.PI]}
          scale={[1, 1, -1]}
        >
          <meshPhysicalMaterial map={texture} roughness={0} reflectivity={1} />
        </mesh>
        <group
          position={[0.77, 0.319, -0.1]}
          rotation={[Math.PI / 2, 0, -0.105]}
        >
          <mesh
            castShadow
            receiveShadow
            geometry={nodes.televisionSpeaker1_1.geometry}
            material={materials.televisionSpeakerWood}
          />
          <mesh
            castShadow
            receiveShadow
            geometry={nodes.televisionSpeaker1_2.geometry}
            material={materials.televisionMetalMedium}
          />
        </group>
        <group
          position={[-0.77, 0.319, -0.1]}
          rotation={[Math.PI / 2, 0, 0.105]}
        >
          <mesh
            castShadow
            receiveShadow
            geometry={nodes.televisionSpeaker2_1.geometry}
            material={materials.televisionSpeakerWood}
          />
          <mesh
            castShadow
            receiveShadow
            geometry={nodes.televisionSpeaker2_2.geometry}
            material={materials.televisionMetalMedium}
          />
        </group>
      </group>
    );
  }
);

useGLTF.preload("/furniture.glb");
