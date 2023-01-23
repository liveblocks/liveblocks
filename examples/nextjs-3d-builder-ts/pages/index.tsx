import { Canvas } from "@react-three/fiber";
import React, { useState, Suspense } from "react";
import { useGLTF, OrbitControls, ContactShadows } from "@react-three/drei";
import { HexColorPicker } from "react-colorful";
import { useStorage, useMutation } from "../liveblocks.config";
import styles from "./index.module.css";
import Colors from "../../types.ts"

/**
 * This file shows how to create a simple 3D builder using React Three Fiber and Liveblocks
 *
 * We use the storage block to persist the show colors even after everyone leaves the room.
 */

export default function Example() {
  // const [material, setMaterial] = useState(null);
  const [material, setMaterial] = useState<{material: string | null}>({material:null});
  const colors = useStorage((root) => root.colors);

  const onChangeColor = useMutation(
    ({ storage }, color) => {
      if (material) {
        // storage.get("colors").set(material, color);
        //set storage for material and color
        // storage.get("colors").set(material, color)
        storage.get("colors").set(material.material, color)
      }
    },
    [material]
  );

  if (!colors) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>
          <img src="https://liveblocks.io/loading.svg" alt="Loading" />
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.canvas}>
        <Canvas dpr={[1, 1.5]} camera={{ position: [0, 0, 2.75] }}>
          <ambientLight intensity={0.3} />
          <spotLight
            intensity={0.3}
            angle={0.1}
            penumbra={1}
            position={[5, 25, 20]}
          />
          <Suspense fallback={null}>
            {colors && (
              <Shoe
                snap={colors}
                selectMaterial={(material: string) => setMaterial({material})}
              />
            )}
            <ContactShadows
              position={[0, -0.8, 0]}
              opacity={0.25}
              scale={10}
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
            color={material ? colors.material : undefined}
            onChange={onChangeColor}
          />
        </div>
      </div>
    </div>
  );
}

type Props= {
  snap: Colors;
  selectMaterial: (material: string) => void;
}

function Shoe({ snap, selectMaterial }: Props) {

  // make typescript happy
  // const { nodes, materials } = useGLTF("/shoe.glb");
  type GLTFResult = { nodes: any; materials: any };

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

export async function getStaticProps() {
  const API_KEY = process.env.NEXT_PUBLIC_LIVEBLOCKS_PUBLIC_KEY;
  const API_KEY_WARNING = process.env.CODESANDBOX_SSE
    ? `Add your public key from https://liveblocks.io/dashboard/apikeys as the \`NEXT_PUBLIC_LIVEBLOCKS_PUBLIC_KEY\` secret in CodeSandbox.\n` +
      `Learn more: https://github.com/liveblocks/liveblocks/tree/main/examples/nextjs-3d-builder#codesandbox.`
    : `Create an \`.env.local\` file and add your public key from https://liveblocks.io/dashboard/apikeys as the \`NEXT_PUBLIC_LIVEBLOCKS_PUBLIC_KEY\` environment variable.\n` +
      `Learn more: https://github.com/liveblocks/liveblocks/tree/main/examples/nextjs-3d-builder#getting-started.`;

  if (!API_KEY) {
    console.warn(API_KEY_WARNING);
  }

  return { props: {} };
}
