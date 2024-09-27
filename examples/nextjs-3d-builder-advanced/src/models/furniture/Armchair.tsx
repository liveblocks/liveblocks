import React, { ComponentProps } from "react";
import { useGLTF } from "@react-three/drei";
import { FurnitureModels } from "./types";

export function Armchair(props: ComponentProps<"group">) {
  const { nodes, materials } = useGLTF("/furniture.glb") as FurnitureModels;

  return (
    <group {...props} dispose={null} userData={{ name: "$armchair" }}>
      <group
        position={[0, 0.424, 0.033]}
        rotation={[Math.PI / 2, 0, 0]}
        userData={{ name: "armchair" }}
      >
        <mesh
          castShadow
          receiveShadow
          geometry={nodes.armchair_1.geometry}
          material={materials.armchairFabric}
        />
        <mesh
          castShadow
          receiveShadow
          geometry={nodes.armchair_2.geometry}
          material={materials.wood}
        />
      </group>
      <mesh
        castShadow
        receiveShadow
        geometry={nodes.armchairGround.geometry}
        material={nodes.armchairGround.material}
        userData={{ name: "armchairGround" }}
        visible={false}
      />
      <mesh
        castShadow
        receiveShadow
        geometry={nodes.armchairPillow.geometry}
        material={materials.armchairFabric}
        position={[0.031, 0.71, 0.122]}
        rotation={[Math.PI / 2, 0, -0.126]}
        userData={{ name: "armchairPillow" }}
      />
    </group>
  );
}

useGLTF.preload("/furniture.glb");
