import React, { ComponentProps } from "react";
import { useGLTF } from "@react-three/drei";
import { FurnitureModels } from "./types";

export function Room(props: ComponentProps<"group">) {
  const { nodes, materials } = useGLTF("/furniture.glb") as FurnitureModels;

  return (
    <group {...props} dispose={null}>
      <group position={[0, -0.054, 0]}>
        <group position={[-0.479, 0.054, 3.886]} rotation={[Math.PI / 2, 0, 0]}>
          <mesh
            castShadow
            receiveShadow
            geometry={nodes.roomDoor1_1.geometry}
            material={materials.roomWood}
          />
          <mesh
            castShadow
            receiveShadow
            geometry={nodes.roomDoor1_2.geometry}
            material={materials.roomMetal}
          />
        </group>
        <group
          position={[-2.381, 0.054, -1.975]}
          rotation={[Math.PI / 2, 0, Math.PI / 2]}
        >
          <mesh
            castShadow
            receiveShadow
            geometry={nodes.roomDoor2_1.geometry}
            material={materials.roomWood}
          />
          <mesh
            castShadow
            receiveShadow
            geometry={nodes.roomDoor2_2.geometry}
            material={materials.roomMetal}
          />
        </group>
        <mesh
          castShadow
          receiveShadow
          geometry={nodes.roomFloor.geometry}
          material={materials.roomWood}
          rotation={[Math.PI / 2, 0, 0]}
        />
        <group
          position={[-2.003, -0.054, -4.054]}
          rotation={[Math.PI / 2, 0, -Math.PI]}
        >
          <mesh
            castShadow
            receiveShadow
            geometry={nodes.roomWalls_1.geometry}
            material={materials.roomWood}
          />
          <mesh
            castShadow
            receiveShadow
            geometry={nodes.roomWalls_2.geometry}
            material={materials.roomWalls}
          />
          <mesh
            receiveShadow
            geometry={nodes.roomWalls_3.geometry}
            material={materials.roomGlass}
          />
        </group>
      </group>
    </group>
  );
}

useGLTF.preload("/furniture.glb");
