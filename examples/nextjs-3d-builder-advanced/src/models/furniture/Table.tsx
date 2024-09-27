import React, { ComponentProps, forwardRef, Ref } from "react";
import { useGLTF } from "@react-three/drei";
import { FurnitureModels } from "./types";
import { Group } from "three";

export const Table = forwardRef(
  (props: ComponentProps<"group">, ref: Ref<Group>) => {
    const { nodes, materials } = useGLTF("/furniture.glb") as FurnitureModels;

    return (
      <group {...props} ref={ref} dispose={null}>
        <group position={[0, 0.308, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <mesh
            castShadow
            receiveShadow
            geometry={nodes.table_1.geometry}
            material={materials.tableWood}
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
        >
          <mesh
            castShadow
            receiveShadow
            geometry={nodes.tableChair1_1.geometry}
            material={materials.tableChairWood}
          />
          <mesh
            castShadow
            receiveShadow
            geometry={nodes.tableChair1_2.geometry}
            material={materials.tableChairFabric}
          />
        </group>
        <group
          position={[0.385, 0.449, 0.75]}
          rotation={[Math.PI / 2, 0, -0.061]}
        >
          <mesh
            castShadow
            receiveShadow
            geometry={nodes.tableChair2_1.geometry}
            material={materials.tableChairWood}
          />
          <mesh
            castShadow
            receiveShadow
            geometry={nodes.tableChair2_2.geometry}
            material={materials.tableChairFabric}
          />
        </group>
        <group
          position={[-0.385, 0.449, -0.75]}
          rotation={[Math.PI / 2, 0, 3.04]}
        >
          <mesh
            castShadow
            receiveShadow
            geometry={nodes.tableChair3_1.geometry}
            material={materials.tableChairWood}
          />
          <mesh
            castShadow
            receiveShadow
            geometry={nodes.tableChair3_2.geometry}
            material={materials.tableChairFabric}
          />
        </group>
        <group
          position={[0.385, 0.449, -0.75]}
          rotation={[Math.PI / 2, 0, -2.934]}
        >
          <mesh
            castShadow
            receiveShadow
            geometry={nodes.tableChair4_1.geometry}
            material={materials.tableChairWood}
          />
          <mesh
            castShadow
            receiveShadow
            geometry={nodes.tableChair4_2.geometry}
            material={materials.tableChairFabric}
          />
        </group>
        <group position={[0, 0.911, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <mesh
            castShadow
            receiveShadow
            geometry={nodes.tableLamp_1.geometry}
            material={materials.tableLamp}
          />
          <mesh
            castShadow
            receiveShadow
            geometry={nodes.tableLamp_2.geometry}
            material={materials.tableMetal}
          />
        </group>
      </group>
    );
  }
);

useGLTF.preload("/furniture.glb");
