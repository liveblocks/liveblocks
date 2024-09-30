import React, { ComponentProps, forwardRef, Ref } from "react";
import { useGLTF } from "@react-three/drei";
import { GLTF } from "three-stdlib";
import { Group, Mesh } from "three";

export type CursorModel = GLTF & {
  nodes: {
    cursor: Mesh;
  };
  materials: {};
};

export const Cursor = forwardRef(
  (
    { color, ...props }: ComponentProps<"group"> & { color: string },
    ref: Ref<Group>
  ) => {
    const { nodes } = useGLTF("/cursor.glb") as CursorModel;

    return (
      <group {...props} ref={ref} dispose={null}>
        <mesh
          castShadow
          receiveShadow
          geometry={nodes.cursor.geometry}
          rotation={[Math.PI / 2, Math.PI / 3, -Math.PI / 4]}
          scale={[0.15, 0.15, 0.15]}
        >
          <meshPhysicalMaterial color={color} roughness={1} reflectivity={1} />
        </mesh>
      </group>
    );
  }
);

useGLTF.preload("/cursor.glb");
