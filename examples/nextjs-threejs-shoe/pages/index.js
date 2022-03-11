/**
 *
 * This file shows how to create a simple collaborative form.
 * https://liveblocks.io/examples/3d-shoe-builder
 *
 * We use the storage block to persist the show colors even after everyone leaves the room.
 */

import { useObject } from "@liveblocks/react";
import { Canvas } from "react-three-fiber";
import React, { useState, Suspense } from "react";
import { useGLTF, OrbitControls, ContactShadows } from "drei";
import { HexColorPicker } from "react-colorful";
import styles from "./index.module.css";

export default function Demo() {
  return (
    <div className={styles.container}>
      <ShoeDemo />
    </div>
  );
}

function ShoeDemo() {
  const [material, setMaterial] = useState(null);
  const colors = useObject("colors");

  if (!colors) {
    return (
      <span className={styles.loading_container}>
        <svg
          className={styles.loading_svg}
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
        >
          <path d="M16 8C16 9.58225 15.5308 11.129 14.6518 12.4446C13.7727 13.7602 12.5233 14.7855 11.0615 15.391C9.59966 15.9965 7.99113 16.155 6.43928 15.8463C4.88743 15.5376 3.46197 14.7757 2.34315 13.6569C1.22433 12.538 0.4624 11.1126 0.153718 9.56072C-0.154964 8.00887 0.00346269 6.40034 0.608964 4.93853C1.21446 3.47672 2.23984 2.22729 3.55544 1.34824C4.87103 0.469192 6.41775 -1.88681e-08 8 0L8 1.52681C6.71972 1.52681 5.4682 1.90645 4.40369 2.61774C3.33917 3.32902 2.50949 4.33999 2.01955 5.52282C1.52961 6.70564 1.40142 8.00718 1.65119 9.26286C1.90096 10.5185 2.51747 11.6719 3.42276 12.5772C4.32805 13.4825 5.48147 14.099 6.73714 14.3488C7.99282 14.5986 9.29436 14.4704 10.4772 13.9805C11.66 13.4905 12.671 12.6608 13.3823 11.5963C14.0935 10.5318 14.4732 9.28028 14.4732 8H16Z" />
        </svg>
      </span>
    );
  }

  return (
    <div className={styles.canvas}>
      <Canvas
        concurrent
        pixelRatio={[1, 1.5]}
        camera={{ position: [0, 0, 2.75] }}
      >
        <ambientLight intensity={0.3} />
        <spotLight
          intensity={0.3}
          angle={0.1}
          penumbra={1}
          position={[5, 25, 20]}
        />
        <Suspense fallback={null}>
          <Shoe
            snap={colors.toObject()}
            selectMaterial={(material) => setMaterial(material)}
          />
          <ContactShadows
            rotation-x={Math.PI / 2}
            position={[0, -0.8, 0]}
            opacity={0.25}
            width={10}
            height={10}
            blur={2}
            far={1}
          />
        </Suspense>
        <OrbitControls
          minPolarAngle={Math.PI / 2}
          maxPolarAngle={Math.PI / 2}
          enableZoom={false}
          enablePan={false}
        />
      </Canvas>

      <div
        className={`${
          material ? styles.colorpicker_active : styles.colorpicker
        }`}
      >
        <HexColorPicker
          color={material ? colors.get(material) : undefined}
          onChange={(color) => {
            if (material) {
              colors.set(material, color);
            }
          }}
        />
      </div>
    </div>
  );
}

function Shoe({ snap, selectMaterial }) {
  const { nodes, materials } = useGLTF("/shoe-draco.glb");

  return (
    <group
      dispose={null}
      onPointerMissed={() => selectMaterial(null)}
      onPointerDown={(e) => {
        e.stopPropagation();
        selectMaterial(e.object.material.name);
      }}
    >
      <mesh
        geometry={nodes.shoe.geometry}
        material={materials.laces}
        material-color={snap.laces}
      />
      <mesh
        geometry={nodes.shoe_1.geometry}
        material={materials.mesh}
        material-color={snap.mesh}
      />
      <mesh
        geometry={nodes.shoe_2.geometry}
        material={materials.caps}
        material-color={snap.caps}
      />
      <mesh
        geometry={nodes.shoe_3.geometry}
        material={materials.inner}
        material-color={snap.inner}
      />
      <mesh
        geometry={nodes.shoe_4.geometry}
        material={materials.sole}
        material-color={snap.sole}
      />
      <mesh
        geometry={nodes.shoe_5.geometry}
        material={materials.stripes}
        material-color={snap.stripes}
      />
      <mesh
        geometry={nodes.shoe_6.geometry}
        material={materials.band}
        material-color={snap.band}
      />
      <mesh
        geometry={nodes.shoe_7.geometry}
        material={materials.patch}
        material-color={snap.patch}
      />
    </group>
  );
}
