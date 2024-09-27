import React, { ComponentProps } from "react";
import { useGLTF } from "@react-three/drei";
import { FurnitureModels } from "./types";

export function Television(props: ComponentProps<"group">) {
  const { nodes, materials } = useGLTF("/furniture.glb") as FurnitureModels;

  return (
    <group {...props} dispose={null} userData={{ name: "$television" }}>
      <group
        position={[0, 0.585, 0]}
        rotation={[Math.PI / 2, 0, 0]}
        userData={{ name: "television" }}
      >
        <mesh
          castShadow
          receiveShadow
          geometry={nodes.television_1.geometry}
          material={materials.metalDark}
        />
        <mesh
          castShadow
          receiveShadow
          geometry={nodes.television_2.geometry}
          material={materials.televisionScreen}
        />
      </group>
      <group
        position={[0, 0.374, 0]}
        rotation={[Math.PI / 2, 0, 0]}
        userData={{ name: "televisionCabinet" }}
      >
        <mesh
          castShadow
          receiveShadow
          geometry={nodes.televisionCabinet_1.geometry}
          material={materials.wood}
        />
        <mesh
          castShadow
          receiveShadow
          geometry={nodes.televisionCabinet_2.geometry}
          material={materials.metal}
        />
      </group>
      <mesh
        castShadow
        receiveShadow
        geometry={nodes.televisionGround.geometry}
        material={nodes.televisionGround.material}
        userData={{ name: "televisionGround" }}
        visible={false}
      />
      <group
        position={[0.77, 0.319, -0.1]}
        rotation={[Math.PI / 2, 0, -0.105]}
        userData={{ name: "televisionSpeaker1" }}
      >
        <mesh
          castShadow
          receiveShadow
          geometry={nodes.televisionSpeaker1_1.geometry}
          material={materials.wood}
        />
        <mesh
          castShadow
          receiveShadow
          geometry={nodes.televisionSpeaker1_2.geometry}
          material={materials.metalMedium}
        />
      </group>
      <group
        position={[-0.77, 0.319, -0.1]}
        rotation={[Math.PI / 2, 0, 0.105]}
        userData={{ name: "televisionSpeaker2" }}
      >
        <mesh
          castShadow
          receiveShadow
          geometry={nodes.televisionSpeaker2_1.geometry}
          material={materials.wood}
        />
        <mesh
          castShadow
          receiveShadow
          geometry={nodes.televisionSpeaker2_2.geometry}
          material={materials.metalMedium}
        />
      </group>
    </group>
  );
}

useGLTF.preload("/furniture.glb");
