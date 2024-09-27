"use client";

import { ElementRef, useCallback, useRef } from "react";
import { Loading } from "../components/Loading";
import {
  ClientSideSuspense,
  shallow,
  useMutation,
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
import { Cursor as CursorModel } from "../models/Cursor";
import {
  initialPresence,
  initialStorage,
  models,
} from "../../liveblocks.config";
import { Matrix4, Vector3 } from "three";
import { useStorageFrame } from "../hooks/useStorageFrame";
import { useOtherFrame } from "../hooks/useOtherFrame";
import { dampM, damp3, dampLookAt } from "maath/easing";

interface CursorProps {
  connectionId: number;
}

interface ShapeProps {
  shapeId: string;
}

const temporaryMatrix = new Matrix4();
const scenePointerMoveEvents: ThreeEvent<PointerEvent>[] = [];

function Cursor({ connectionId }: CursorProps) {
  const cursorRef = useRef<ElementRef<typeof CursorModel>>(null);
  const cursorPositionDebugRef = useRef<ElementRef<typeof Sphere>>(null);
  const cursorPointingToDebugRef = useRef<ElementRef<typeof Sphere>>(null);

  useOtherFrame(connectionId, (other, _, delta) => {
    if (
      !cursorRef.current ||
      !cursorPositionDebugRef.current ||
      !cursorPointingToDebugRef.current ||
      !other.presence.cursor
    ) {
      return;
    }

    damp3(
      cursorRef.current.position,
      other.presence.cursor.position as Vector3,
      0.1,
      delta
    );
    dampLookAt(
      cursorRef.current,
      other.presence.cursor.pointingTo as Vector3,
      0.1,
      delta
    );

    damp3(
      cursorPositionDebugRef.current.position,
      other.presence.cursor.position as Vector3,
      0.1,
      delta
    );
    damp3(
      cursorPointingToDebugRef.current.position,
      other.presence.cursor.pointingTo as Vector3,
      0.1,
      delta
    );
  });

  return (
    <>
      <CursorModel ref={cursorRef}>
        <meshBasicMaterial color="#ddd" />
      </CursorModel>
      <Sphere
        scale={[0.05, 0.05, 0.05]}
        ref={cursorPositionDebugRef}
        // TODO: Debug
        visible={false}
      >
        <meshBasicMaterial color="red" />
      </Sphere>
      <Sphere
        scale={[0.05, 0.05, 0.05]}
        ref={cursorPointingToDebugRef}
        // TODO: Debug
        visible={false}
      >
        <meshBasicMaterial color="blue" />
      </Sphere>
    </>
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

  useStorageFrame((storage, _rootState, delta) => {
    if (!ref.current) {
      return;
    }

    const shape = storage.get("shapes").get(shapeId);

    if (!shape) {
      return;
    }

    const matrix = temporaryMatrix.fromArray(shape.get("matrix"));
    dampM(ref.current.matrix, matrix, 0.1, delta);
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

      const offsetPoint = closestPointerMove.face?.normal
        .clone()
        .transformDirection(closestPointerMove.object.matrixWorld)
        .normalize()
        .multiplyScalar(0.1)
        .add(closestPointerMove.point);

      updateMyPresense({
        cursor: {
          position: offsetPoint ?? closestPointerMove.point,
          pointingTo: closestPointerMove.point,
        },
      });

      // Clear the events for the next frame
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
