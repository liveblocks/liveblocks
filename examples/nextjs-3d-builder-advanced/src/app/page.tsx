"use client";

import { useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { RoomProvider } from "@liveblocks/react/suspense";
import { Loading } from "../components/Loading";
import { ClientSideSuspense } from "@liveblocks/react";
import { ErrorBoundary } from "react-error-boundary";
import { Canvas } from "@react-three/fiber";
import { CameraControls, Environment, Preload } from "@react-three/drei";
import {
  Bloom,
  EffectComposer,
  N8AO,
  ToneMapping,
} from "@react-three/postprocessing";
import { Armchair } from "../models/furniture/Armchair";
import { CoffeeTable } from "../models/furniture/CoffeeTable";
import { Lamp } from "../models/furniture/Lamp";
import { Plant } from "../models/furniture/Plant";
import { Sofa } from "../models/furniture/Sofa";
import { Table } from "../models/furniture/Table";
import { Television } from "../models/furniture/Television";

function Scene() {
  return (
    <>
      <Armchair position={[2.5, 0, -0.5]} />
      <CoffeeTable position={[0, 0, 4.5]} />
      <Lamp position={[2.5, 0, 2.5]} />
      <Plant position={[2.5, 0, 4.5]} />
      <Sofa position={[0, 0, 2.5]} />
      <Table position={[0, 0, 0]} />
      <Television position={[0, 0, 6.5]} />
    </>
  );
}

function Example() {
  return (
    <Canvas
      shadows
      flat
      // events={createEventsManager}
      // raycaster={{
      //   layers: EVENT_LAYERS,
      // }}
      className="canvas"
      dpr={[1, 2]}
    >
      <Scene />

      <CameraControls makeDefault />

      <ambientLight intensity={0.5} />
      <directionalLight position={[5, 5, 5]} intensity={1} castShadow />
      <Environment preset="apartment" />

      <EffectComposer>
        <N8AO aoRadius={0.5} intensity={1.5} halfRes />
        <Bloom mipmapBlur />
        <ToneMapping />
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
