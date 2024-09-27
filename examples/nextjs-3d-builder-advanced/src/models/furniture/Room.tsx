import React, { ComponentProps } from "react";
import { useGLTF } from "@react-three/drei";
import { FurnitureModels } from "./types";

export function Room(props: ComponentProps<"group">) {
  const { nodes, materials } = useGLTF("/furniture.glb") as FurnitureModels;

  return (
    <group {...props} dispose={null} userData={{ name: "$room" }}>
      <group
        position={[-0.479, 0.054, 3.895]}
        rotation={[Math.PI / 2, 0, 0]}
        userData={{ name: "roomDoor1" }}
      >
        <mesh
          castShadow
          receiveShadow
          geometry={nodes.roomDoor1_1.geometry}
          material={materials.wood}
        />
        <mesh
          castShadow
          receiveShadow
          geometry={nodes.roomDoor1_2.geometry}
          material={materials.metal}
        />
      </group>
      <group
        position={[-2.403, 0.054, 0.509]}
        rotation={[Math.PI / 2, 0, Math.PI / 2]}
        userData={{ name: "roomDoor2" }}
      >
        <mesh
          castShadow
          receiveShadow
          geometry={nodes.roomDoor2_1.geometry}
          material={materials.wood}
        />
        <mesh
          castShadow
          receiveShadow
          geometry={nodes.roomDoor2_2.geometry}
          material={materials.metal}
        />
      </group>
      <mesh
        castShadow
        receiveShadow
        geometry={nodes.roomFloor1.geometry}
        material={materials.wood}
        rotation={[Math.PI / 2, 0, 0]}
        userData={{ name: "roomFloor1" }}
      />
      <group
        position={[1.5, -0.054, 4.054]}
        rotation={[Math.PI / 2, 0, -Math.PI]}
        userData={{ name: "roomWall1" }}
      >
        <mesh
          castShadow
          receiveShadow
          geometry={nodes.roomWall1_1.geometry}
          material={materials.wood}
        />
        <mesh
          castShadow
          receiveShadow
          geometry={nodes.roomWall1_2.geometry}
          material={materials.metalDark}
        />
        <mesh
          castShadow
          receiveShadow
          geometry={nodes.roomWall1_3.geometry}
          material={materials.glass}
        />
      </group>
      <group
        position={[-2.553, -0.054, 2]}
        rotation={[Math.PI / 2, 0, -Math.PI / 2]}
        userData={{ name: "roomWall2" }}
      >
        <mesh
          castShadow
          receiveShadow
          geometry={nodes.roomWall2_1.geometry}
          material={materials.wood}
        />
        <mesh
          castShadow
          receiveShadow
          geometry={nodes.roomWall2_2.geometry}
          material={materials.metalDark}
        />
        <mesh
          castShadow
          receiveShadow
          geometry={nodes.roomWall2_3.geometry}
          material={materials.glass}
        />
      </group>
      <group
        position={[-2.553, -0.054, -2]}
        rotation={[Math.PI / 2, 0, -Math.PI / 2]}
        userData={{ name: "roomWall3" }}
      >
        <mesh
          castShadow
          receiveShadow
          geometry={nodes.roomWall3_1.geometry}
          material={materials.wood}
        />
        <mesh
          castShadow
          receiveShadow
          geometry={nodes.roomWall3_2.geometry}
          material={materials.metalDark}
        />
        <mesh
          castShadow
          receiveShadow
          geometry={nodes.roomWall3_3.geometry}
          material={materials.glass}
        />
      </group>
      <group
        position={[2.554, -0.054, 3.106]}
        rotation={[Math.PI / 2, 0, Math.PI / 2]}
        userData={{ name: "roomWallDown1" }}
      >
        <mesh
          castShadow
          receiveShadow
          geometry={nodes.roomWallDown1_1.geometry}
          material={materials.wood}
        />
        <mesh
          castShadow
          receiveShadow
          geometry={nodes.roomWallDown1_2.geometry}
          material={materials.metalDark}
        />
      </group>
      <group
        position={[-2.003, -0.054, -4.054]}
        rotation={[Math.PI / 2, 0, -Math.PI]}
        userData={{ name: "roomWallDown2" }}
      >
        <mesh
          castShadow
          receiveShadow
          geometry={nodes.roomWallDown2_1.geometry}
          material={materials.wood}
        />
        <mesh
          castShadow
          receiveShadow
          geometry={nodes.roomWallDown2_2.geometry}
          material={materials.metalDark}
        />
      </group>
    </group>
  );
}

useGLTF.preload("/furniture.glb");
