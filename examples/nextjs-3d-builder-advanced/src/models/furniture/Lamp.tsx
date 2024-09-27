import React, { ComponentProps } from "react";
import { useGLTF } from "@react-three/drei";
import { FurnitureModels } from "./types";

export function Lamp(props: ComponentProps<"group">) {
  const { nodes, materials } = useGLTF("/furniture.glb") as FurnitureModels;

  return (
    <group {...props} dispose={null} userData={{ name: "$lamp" }}>
      <group rotation={[Math.PI / 2, 0, 0]} userData={{ name: "lamp" }}>
        <mesh
          castShadow
          receiveShadow
          geometry={nodes.lamp_1.geometry}
          material={materials.metal}
        />
        <mesh
          castShadow
          receiveShadow
          geometry={nodes.lamp_2.geometry}
          material={materials.lamp}
        />
      </group>
      <mesh
        castShadow
        receiveShadow
        geometry={nodes.lampGround.geometry}
        material={nodes.lampGround.material}
        userData={{ name: "lampGround" }}
        visible={false}
      />
    </group>
  );
}

useGLTF.preload("/furniture.glb");
