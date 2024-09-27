import React, { ComponentProps } from "react";
import { useGLTF } from "@react-three/drei";
import { FurnitureModels } from "./types";

export function Plant(props: ComponentProps<"group">) {
  const { nodes, materials } = useGLTF("/furniture.glb") as FurnitureModels;

  return (
    <group {...props} dispose={null}>
      <group rotation={[Math.PI / 2, 0, 0]}>
        <mesh
          castShadow
          receiveShadow
          geometry={nodes.plant_1.geometry}
          material={materials.plantWood}
        />
        <mesh
          castShadow
          receiveShadow
          geometry={nodes.plant_2.geometry}
          material={materials.plantGround}
        />
        <mesh
          castShadow
          receiveShadow
          geometry={nodes.plant_3.geometry}
          material={materials.plantPlant}
        />
      </group>
    </group>
  );
}

useGLTF.preload("/furniture.glb");
