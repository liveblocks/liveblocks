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
  (props: ComponentProps<"group">, ref: Ref<Group>) => {
    const { nodes } = useGLTF("/cursor.glb") as CursorModel;

    return (
      <group {...props} ref={ref} dispose={null}>
        <mesh
          castShadow
          receiveShadow
          geometry={nodes.cursor.geometry}
          material={nodes.cursor.material}
        />
      </group>
    );
  }
);

useGLTF.preload("/cursor.glb");
