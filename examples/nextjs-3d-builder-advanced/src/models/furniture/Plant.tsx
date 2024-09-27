import React, { ComponentProps } from "react";
import { useGLTF } from "@react-three/drei";
import { FurnitureModels } from "./types";

export function Plant(props: ComponentProps<"group">) {
  const { nodes, materials } = useGLTF("/furniture.glb") as FurnitureModels;

  return (
    <group {...props} dispose={null} userData={{ name: "$plant" }}>
      <group rotation={[Math.PI / 2, 0, 0]} userData={{ name: "plant" }}>
        <mesh
          castShadow
          receiveShadow
          geometry={nodes.plant_1.geometry}
          material={materials.wood}
        />
        <mesh
          castShadow
          receiveShadow
          geometry={nodes.plant_2.geometry}
          material={materials.woodDark}
        />
        <mesh
          castShadow
          receiveShadow
          geometry={nodes.plant_3.geometry}
          material={materials.plant}
        />
      </group>
      <mesh
        castShadow
        receiveShadow
        geometry={nodes.plantGround.geometry}
        material={nodes.plantGround.material}
        userData={{ name: "plantGround" }}
        visible={false}
      />
    </group>
  );
}

useGLTF.preload("/furniture.glb");
