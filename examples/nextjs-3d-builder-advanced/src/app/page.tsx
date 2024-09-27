"use client";

import {
  ElementRef,
  PropsWithChildren,
  useCallback,
  useEffect,
  useMemo,
  useRef,
} from "react";
import { useSearchParams } from "next/navigation";
import { RoomProvider, useStorage } from "@liveblocks/react/suspense";
import { Loading } from "../components/Loading";
import { ClientSideSuspense, shallow, useMutation } from "@liveblocks/react";
import { ErrorBoundary } from "react-error-boundary";
import { Canvas } from "@react-three/fiber";
import {
  CameraControls,
  Environment,
  Grid,
  PivotControls,
  Preload,
} from "@react-three/drei";
import CameraControlsImpl from "camera-controls";
import { EffectComposer, N8AO } from "@react-three/postprocessing";
import { Room } from "../models/furniture/Room";
import { initialStorage, models } from "../../liveblocks.config";
import { Matrix4 } from "three";

interface StorageShapeProps {
  shapeId: string;
}

function StorageShape({ shapeId }: StorageShapeProps) {
  const ref = useRef<ElementRef<"group">>(null);
  const isDragging = useRef(false);
  const shape = useStorage((root) => root.shapes.get(shapeId), shallow);

  const setShapeMatrix = useMutation(({ storage }, matrix: Matrix4) => {
    const shape = storage.get("shapes").get(shapeId);

    if (!shape) {
      return null;
    }

    shape.set("matrix", matrix.toArray());
  }, []);

  const handleDragStart = useCallback(() => {
    isDragging.current = true;
  }, []);

  const handleDrag = useCallback(() => {
    if (ref.current) {
      setShapeMatrix(ref.current.matrix);
    }
  }, []);

  const handleDragEnd = useCallback(() => {
    isDragging.current = false;
  }, []);

  useEffect(() => {
    if (!ref.current || !shape || isDragging.current) {
      return;
    }

    ref.current.matrix.fromArray(shape.matrix);
  }, [shape]);

  if (!shape) {
    return null;
  }

  const Model = models[shape.model].model;

  console.log("Re-render", shapeId);

  return (
    <PivotControls
      ref={ref}
      scale={100}
      fixed
      rotation={[0, Math.PI / 2, 0]}
      depthTest={false}
      activeAxes={[true, false, true]}
      disableScaling
      annotations
      onDragStart={handleDragStart}
      onDrag={handleDrag}
      onDragEnd={handleDragEnd}
    >
      <Model />
    </PivotControls>
  );
}

function Scene() {
  const shapeIds = useStorage(
    (root) => Array.from(root.shapes.keys()),
    shallow
  );

  return (
    <>
      <Room />

      {shapeIds.map((shapeId) => (
        <StorageShape key={shapeId} shapeId={shapeId} />
      ))}
    </>
  );
}

function Example() {
  const cameraControlsCallbackRef = useCallback(
    (cameraControls: CameraControlsImpl | null) => {
      // Lift the camera up a bit
      cameraControls?.truck(0, -0.75);
    },
    []
  );

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
        maxPolarAngle={Math.PI * 0.45}
        polarAngle={Math.PI * 0.3}
        distance={50}
        minDistance={30}
        maxDistance={100}
        truckSpeed={0}
        ref={cameraControlsCallbackRef}
      />

      <directionalLight position={[-12, 16, -8]} intensity={4} castShadow />

      <Environment preset="city" />

      <Grid
        position={[-0.5, 0.01, 0]}
        args={[1, 1]}
        infiniteGrid
        sectionThickness={0}
        cellSize={1}
        cellThickness={1.5}
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
  // const roomId = useExampleRoomId(
  //   "liveblocks:examples:nextjs-3d-builder-advanced"
  // );

  return (
    <main>
      <RoomProvider
        id="liveblocks:examples:nextjs-3d-builder-advanced-3"
        initialStorage={initialStorage}
      >
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

// /**
//  * This function is used when deploying an example on liveblocks.io.
//  * You can ignore it completely if you run the example locally.
//  */
// function useExampleRoomId(roomId: string) {
//   const params = useSearchParams();
//   const exampleId = params?.get("exampleId");

//   const exampleRoomId = useMemo(() => {
//     return exampleId ? `${roomId}-${exampleId}` : roomId;
//   }, [roomId, exampleId]);

//   return exampleRoomId;
// }
