import React, { ComponentProps } from "react";
import { useGLTF } from "@react-three/drei";
import { FurnitureModels } from "./types";

export function Lamp(props: ComponentProps<"group">) {
  const { nodes, materials } = useGLTF("/furniture.glb") as FurnitureModels;

  return (
    <group {...props} dispose={null}>
      <group rotation={[Math.PI / 2, 0, 0]}>
        <mesh
          castShadow
          receiveShadow
          geometry={nodes.lamp_1.geometry}
          material={materials.lampMetal}
        />
        <mesh
          castShadow
          receiveShadow
          geometry={nodes.lamp_2.geometry}
          material={materials.lampLamp}
        />
      </group>
    </group>
  );
}

useGLTF.preload("/furniture.glb");
