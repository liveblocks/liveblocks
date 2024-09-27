import React, { ComponentProps } from "react";
import { useGLTF } from "@react-three/drei";
import { FurnitureModels } from "./types";

export function CoffeeTable(props: ComponentProps<"group">) {
  const { nodes, materials } = useGLTF("/furniture.glb") as FurnitureModels;

  return (
    <group {...props} dispose={null} userData={{ name: "$coffeeTable" }}>
      <group
        position={[0, 0.195, 0]}
        rotation={[Math.PI / 2, 0, 0]}
        userData={{ name: "coffeeTable" }}
      >
        <mesh
          castShadow
          receiveShadow
          geometry={nodes.coffeeTable_1.geometry}
          material={materials.metal}
        />
        <mesh
          castShadow
          receiveShadow
          geometry={nodes.coffeeTable_2.geometry}
          material={materials.glass}
        />
      </group>
      <mesh
        castShadow
        receiveShadow
        geometry={nodes.coffeeTableGround.geometry}
        material={nodes.coffeeTableGround.material}
        userData={{ name: "coffeeTableGround" }}
        visible={false}
      />
      <group
        position={[0.2, 0.495, 0]}
        rotation={[Math.PI / 2, 0, 0]}
        userData={{ name: "coffeeTablePlant1" }}
      >
        <mesh
          castShadow
          receiveShadow
          geometry={nodes.coffeeTablePlant1_1.geometry}
          material={materials.wood}
        />
        <mesh
          castShadow
          receiveShadow
          geometry={nodes.coffeeTablePlant1_2.geometry}
          material={materials.plant}
        />
      </group>
      <group
        position={[-0.2, 0.495, 0]}
        rotation={[Math.PI / 2, 0, 0]}
        userData={{ name: "coffeeTablePlant2" }}
      >
        <mesh
          castShadow
          receiveShadow
          geometry={nodes.coffeeTablePlant2_1.geometry}
          material={materials.wood}
        />
        <mesh
          castShadow
          receiveShadow
          geometry={nodes.coffeeTablePlant2_2.geometry}
          material={materials.plant}
        />
      </group>
    </group>
  );
}

useGLTF.preload("/furniture.glb");
