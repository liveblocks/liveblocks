"use client";

import { useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { RoomProvider } from "@liveblocks/react/suspense";
import { Loading } from "../components/Loading";
import { ClientSideSuspense } from "@liveblocks/react";
import { ErrorBoundary } from "react-error-boundary";
import { Canvas } from "@react-three/fiber";
import {
  CameraControls,
  Environment,
  Grid,
  PivotControls,
  Preload,
} from "@react-three/drei";
import { EffectComposer, N8AO } from "@react-three/postprocessing";
import { Armchair } from "../models/furniture/Armchair";
import { CoffeeTable } from "../models/furniture/CoffeeTable";
import { Lamp } from "../models/furniture/Lamp";
import { Plant } from "../models/furniture/Plant";
import { Sofa } from "../models/furniture/Sofa";
import { Table } from "../models/furniture/Table";
import { Television } from "../models/furniture/Television";
import { Room } from "../models/furniture/Room";

function Scene() {
  return (
    <>
      <Room />

      <PivotControls
        scale={100}
        fixed
        rotation={[0, Math.PI / 2, 0]}
        depthTest={false}
        activeAxes={[true, false, true]}
        disableScaling
        annotations
      >
        <Armchair />
      </PivotControls>
      <PivotControls
        scale={100}
        fixed
        rotation={[0, Math.PI / 2, 0]}
        depthTest={false}
        activeAxes={[true, false, true]}
        disableScaling
        annotations
      >
        <CoffeeTable />
      </PivotControls>
      <PivotControls
        scale={100}
        fixed
        rotation={[0, Math.PI / 2, 0]}
        depthTest={false}
        activeAxes={[true, false, true]}
        disableScaling
        annotations
      >
        <Lamp />
      </PivotControls>
      <PivotControls
        scale={100}
        fixed
        rotation={[0, Math.PI / 2, 0]}
        depthTest={false}
        activeAxes={[true, false, true]}
        disableScaling
        annotations
      >
        <Plant />
      </PivotControls>
      <PivotControls
        scale={100}
        fixed
        rotation={[0, Math.PI / 2, 0]}
        depthTest={false}
        activeAxes={[true, false, true]}
        disableScaling
        annotations
      >
        <Sofa />
      </PivotControls>
      <PivotControls
        scale={100}
        fixed
        rotation={[0, Math.PI / 2, 0]}
        depthTest={false}
        activeAxes={[true, false, true]}
        disableScaling
        annotations
      >
        <Table />
      </PivotControls>
      <PivotControls
        scale={100}
        fixed
        rotation={[0, Math.PI / 2, 0]}
        depthTest={false}
        activeAxes={[true, false, true]}
        disableScaling
        annotations
      >
        <Television />
      </PivotControls>
    </>
  );
}

function Example() {
  return (
    <Canvas
      shadows
      // events={createEventsManager}
      // raycaster={{
      //   layers: EVENT_LAYERS,
      // }}
      className="canvas"
      dpr={[1, 2]}
      camera={{
        fov: 10,
        far: 200,
      }}
    >
      <Scene />

      <CameraControls
        makeDefault
        azimuthAngle={Math.PI * 0.7}
        minAzimuthAngle={Math.PI * 0.5}
        maxAzimuthAngle={Math.PI}
        maxPolarAngle={Math.PI * 0.45}
        polarAngle={Math.PI / 3}
        distance={50}
        minDistance={50}
        maxDistance={50}
        dollySpeed={0}
        truckSpeed={0}
      />

      <ambientLight intensity={0.5} />
      <directionalLight position={[10, 10, 5]} intensity={1} />
      <directionalLight position={[-10, -10, -5]} intensity={0.5} />

      <Environment preset="city" />

      <Grid
        position={[-0.5, 0.06, 0]}
        args={[1, 1]}
        infiniteGrid
        sectionThickness={0}
        cellSize={1}
        cellThickness={1}
        cellColor="#666"
      />

      <EffectComposer enableNormalPass>
        <N8AO aoRadius={0.5} intensity={1.5} />
      </EffectComposer>

      <Preload all />
    </Canvas>
  );
}

export default function Page() {
  const roomId = useExampleRoomId(
    "liveblocks:examples:nextjs-3d-builder-advanced"
  );

  return (
    <main>
      <RoomProvider id={roomId}>
        <ErrorBoundary
          fallback={<div className="error">There was an error.</div>}
        >
          <ClientSideSuspense fallback={<Loading />}>
            <Example />
          </ClientSideSuspense>
        </ErrorBoundary>
      </RoomProvider>
    </main>
  );
}

/**
 * This function is used when deploying an example on liveblocks.io.
 * You can ignore it completely if you run the example locally.
 */
function useExampleRoomId(roomId: string) {
  const params = useSearchParams();
  const exampleId = params?.get("exampleId");

  const exampleRoomId = useMemo(() => {
    return exampleId ? `${roomId}-${exampleId}` : roomId;
  }, [roomId, exampleId]);

  return exampleRoomId;
}
