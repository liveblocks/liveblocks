import React, { ComponentProps } from "react";
import { useGLTF } from "@react-three/drei";
import { FurnitureModels } from "./types";

export function Table(props: ComponentProps<"group">) {
  const { nodes, materials } = useGLTF("/furniture.glb") as FurnitureModels;

  return (
    <group {...props} dispose={null} userData={{ name: "$table" }}>
      <group
        position={[0, 0.308, 0]}
        rotation={[Math.PI / 2, 0, 0]}
        userData={{ name: "table" }}
      >
        <mesh
          castShadow
          receiveShadow
          geometry={nodes.table_1.geometry}
          material={materials.wood}
        />
        <mesh
          castShadow
          receiveShadow
          geometry={nodes.table_2.geometry}
          material={materials.tableFabric}
        />
      </group>
      <group
        position={[-0.385, 0.449, 0.75]}
        rotation={[Math.PI / 2, 0, 0.067]}
        userData={{ name: "tableChair1" }}
      >
        <mesh
          castShadow
          receiveShadow
          geometry={nodes.tableChair1_1.geometry}
          material={materials.wood}
        />
        <mesh
          castShadow
          receiveShadow
          geometry={nodes.tableChair1_2.geometry}
          material={materials.tableFabric}
        />
      </group>
      <group
        position={[0.385, 0.449, 0.75]}
        rotation={[Math.PI / 2, 0, -0.061]}
        userData={{ name: "tableChair2" }}
      >
        <mesh
          castShadow
          receiveShadow
          geometry={nodes.tableChair2_1.geometry}
          material={materials.wood}
        />
        <mesh
          castShadow
          receiveShadow
          geometry={nodes.tableChair2_2.geometry}
          material={materials.tableFabric}
        />
      </group>
      <group
        position={[-0.385, 0.449, -0.75]}
        rotation={[Math.PI / 2, 0, 3.04]}
        userData={{ name: "tableChair3" }}
      >
        <mesh
          castShadow
          receiveShadow
          geometry={nodes.tableChair3_1.geometry}
          material={materials.wood}
        />
        <mesh
          castShadow
          receiveShadow
          geometry={nodes.tableChair3_2.geometry}
          material={materials.tableFabric}
        />
      </group>
      <group
        position={[0.385, 0.449, -0.75]}
        rotation={[Math.PI / 2, 0, -2.934]}
        userData={{ name: "tableChair4" }}
      >
        <mesh
          castShadow
          receiveShadow
          geometry={nodes.tableChair4_1.geometry}
          material={materials.wood}
        />
        <mesh
          castShadow
          receiveShadow
          geometry={nodes.tableChair4_2.geometry}
          material={materials.tableFabric}
        />
      </group>
      <mesh
        castShadow
        receiveShadow
        geometry={nodes.tableGround.geometry}
        material={nodes.tableGround.material}
        userData={{ name: "tableGround" }}
        visible={false}
      />
      <group
        position={[0, 0.911, 0]}
        rotation={[Math.PI / 2, 0, 0]}
        userData={{ name: "tableLamp" }}
      >
        <mesh
          castShadow
          receiveShadow
          geometry={nodes.tableLamp_1.geometry}
          material={materials.lamp}
        />
        <mesh
          castShadow
          receiveShadow
          geometry={nodes.tableLamp_2.geometry}
          material={materials.metal}
        />
      </group>
    </group>
  );
}

useGLTF.preload("/furniture.glb");
