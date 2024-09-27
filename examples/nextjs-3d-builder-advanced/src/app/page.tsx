"use client";

import { ElementRef, useCallback, useRef } from "react";
import { Loading } from "../components/Loading";
import {
  ClientSideSuspense,
  shallow,
  useMutation,
  useRoom,
  RoomProvider,
  useStorage,
  useOthersConnectionIds,
  useUpdateMyPresence,
} from "@liveblocks/react/suspense";
import { ErrorBoundary } from "react-error-boundary";
import { Canvas, ThreeEvent, useFrame } from "@react-three/fiber";
import {
  CameraControls,
  Environment,
  Grid,
  PivotControls,
  Preload,
  Sphere,
} from "@react-three/drei";
import CameraControlsImpl from "camera-controls";
import { EffectComposer, N8AO } from "@react-three/postprocessing";
import { Room } from "../models/furniture/Room";
import {
  initialPresence,
  initialStorage,
  models,
} from "../../liveblocks.config";
import { Matrix4 } from "three";
import { useStorageFrame } from "../hooks/useStorageFrame";
import { useOtherFrame } from "../hooks/useOtherFrame";

interface CursorProps {
  connectionId: number;
}

interface ShapeProps {
  shapeId: string;
}

function Cursor({ connectionId }: CursorProps) {
  const cursorRef = useRef<ElementRef<typeof Sphere>>(null);

  useOtherFrame(connectionId, (other) => {
    if (!cursorRef.current || !other.presence.position) {
      return;
    }

    cursorRef.current.position.copy(other.presence.position);
  });

  return (
    <Sphere ref={cursorRef} scale={[0.15, 0.15, 0.15]}>
      <meshBasicMaterial color="#ddd" />
    </Sphere>
  );
}

function Shape({ shapeId }: ShapeProps) {
  const ref = useRef<ElementRef<"group">>(null);

  const model = useStorage((root) => {
    const shape = root.shapes.get(shapeId);
    if (shape === undefined) return null;
    return shape.model;
  });

  const setShapeMatrix = useMutation(({ storage }, matrix: Matrix4) => {
    const shape = storage.get("shapes").get(shapeId);

    if (!shape) {
      return null;
    }

    shape.set("matrix", matrix.toArray());
  }, []);

  useStorageFrame((storage) => {
    if (!ref.current) {
      return;
    }

    const shape = storage.get("shapes").get(shapeId);

    if (!shape) {
      return;
    }

    ref.current.matrix.fromArray(shape.get("matrix"));
  });

  if (model === null) {
    return null;
  }

  const Model = models[model].model;

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
      onDrag={setShapeMatrix}
      autoTransform={false}
    >
      <Model />
    </PivotControls>
  );
}

const scenePointerMoveEvents: ThreeEvent<PointerEvent>[] = [];

function Scene() {
  const updateMyPresense = useUpdateMyPresence();
  const shapeIds = useStorage(
    (root) => Array.from(root.shapes.keys()),
    shallow
  );
  const connectionIds = useOthersConnectionIds();

  // Collect all pointer events related to the scene in the current frame
  useFrame(() => {
    if (scenePointerMoveEvents.length > 0) {
      // Find the closest one to the camera
      const closestPointerMove = scenePointerMoveEvents.reduce(
        (closestPointerMove, intersection) => {
          return intersection.distance < closestPointerMove.distance
            ? intersection
            : closestPointerMove;
        }
      );

      // if (cursorRef.current) {
      //   cursorRef.current.position.copy(closestPointerMove.point);
      // }
      updateMyPresense({ position: closestPointerMove.point });

      scenePointerMoveEvents.length = 0;
    }
  });

  return (
    <group>
      <group
        name="scene"
        onPointerMove={(event) => {
          scenePointerMoveEvents.push(event);
        }}
      >
        <Room />

        {shapeIds.map((shapeId) => (
          <Shape key={shapeId} shapeId={shapeId} />
        ))}
      </group>

      <group name="cursors">
        {connectionIds.map((connectionId) => (
          <Cursor key={connectionId} connectionId={connectionId} />
        ))}
      </group>
    </group>
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
        cellThickness={1.25}
        cellColor="#666"
        fadeDistance={100}
        fadeStrength={10}
        fadeFrom={0}
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
        initialPresence={initialPresence}
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
