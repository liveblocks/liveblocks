"use client";

import {
  ElementRef,
  useCallback,
  useLayoutEffect,
  useMemo,
  useRef,
} from "react";
import { Loading } from "../components/Loading";
import {
  ClientSideSuspense,
  shallow,
  useMutation,
  RoomProvider,
  useStorage,
  useOthersConnectionIds,
  useUpdateMyPresence,
  useOther,
} from "@liveblocks/react/suspense";
import { ErrorBoundary } from "react-error-boundary";
import { Canvas } from "@react-three/fiber";
import {
  CameraControls,
  Environment,
  Grid,
  PivotControls,
  Plane,
  Preload,
  SoftShadows,
} from "@react-three/drei";
import CameraControlsImpl from "camera-controls";
import {
  DepthOfField,
  EffectComposer,
  N8AO,
} from "@react-three/postprocessing";
import { Room } from "../models/furniture/Room";
import { Cursor as CursorModel } from "../models/Cursor";
import {
  initialPresence,
  initialStorage,
  models,
} from "../../liveblocks.config";
import { Matrix4 } from "three";
import { useStorageFrame } from "../hooks/useStorageFrame";
import { useOtherFrame } from "../hooks/useOtherFrame";
import { useSearchParams } from "next/navigation";
import { useClosestThreePointerEvent } from "../hooks/useClosestThreePointerEvent";
import {
  useDampLookAt,
  useDampMatrix4,
  useDampVector3,
} from "../hooks/useDamp";

const DAMPING = 0.1;
const CURSOR_OFFSET = 0.1;
const CAMERA_VERTICAL_OFFSET = 0.75;

interface CursorProps {
  connectionId: number;
}

interface ShapeProps {
  shapeId: string;
}

function Cursor({ connectionId }: CursorProps) {
  const cursorRef = useRef<ElementRef<typeof CursorModel>>(null);
  const color = useOther(connectionId, (user) => user.info.color, shallow);

  const animateCursorPosition = useDampVector3(cursorRef, "position", DAMPING);
  const animateCursorLookAt = useDampLookAt(cursorRef, DAMPING);

  console.log(`[CURSOR ${connectionId}] Render`);

  // Animate or hide the cursor on every frame
  useOtherFrame(connectionId, (other, _, delta) => {
    if (!cursorRef.current) {
      return;
    }

    if (other.presence.cursor) {
      cursorRef.current.visible = true;

      animateCursorPosition(other.presence.cursor.position, delta);
      animateCursorLookAt(other.presence.cursor.pointingTo, delta);
    } else {
      cursorRef.current.visible = false;
    }
  });

  return <CursorModel ref={cursorRef} color={color} visible={false} />;
}

function Shape({ shapeId }: ShapeProps) {
  const ref = useRef<ElementRef<"group">>(null);
  const model = useStorage((root) => {
    const shape = root.shapes.get(shapeId);

    return shape?.model;
  });

  const animateShapeMatrix = useDampMatrix4(ref, "matrix", DAMPING);
  const setShapeMatrix = useMutation(({ storage }, matrix: Matrix4) => {
    const shape = storage.get("shapes").get(shapeId);

    shape?.set("matrix", matrix.toArray());
  }, []);

  console.log(`[SHAPE ${shapeId}] Render`);

  // Animate the shape on every frame
  useStorageFrame((storage, _, delta) => {
    const shape = storage.get("shapes").get(shapeId);

    if (shape) {
      animateShapeMatrix(shape.get("matrix"), delta);
    }
  });

  if (!model) {
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
  const connectionIds = useOthersConnectionIds();
  const shapeIds = useStorage(
    (root) => Array.from(root.shapes.keys()),
    shallow
  );

  // Update the cursor position
  const handlePointerMove = useClosestThreePointerEvent((event) => {
    const offsetPoint = event.face?.normal
      .clone()
      .transformDirection(event.object.matrixWorld)
      .normalize()
      .multiplyScalar(CURSOR_OFFSET)
      .add(event.point);

    updateMyPresense({
      cursor: {
        position: offsetPoint ?? event.point,
        pointingTo: event.point,
      },
    });
  });

  return (
    <>
      <group name="scene" onPointerMove={handlePointerMove}>
        <group name="shapes">
          {shapeIds.map((shapeId) => (
            <Shape key={shapeId} shapeId={shapeId} />
          ))}
        </group>

        <Room />

        <Plane
          name="ground"
          scale={10000}
          rotation={[-Math.PI / 2, 0, 0]}
          position={[0, -0.2, 0]}
          visible={false}
        />
      </group>

      <group name="cursors">
        {connectionIds.map((connectionId) => (
          <Cursor key={connectionId} connectionId={connectionId} />
        ))}
      </group>
    </>
  );
}

function Camera() {
  const cameraControlsRef = useRef<CameraControlsImpl | null>(null);

  // Lift the camera up a bit
  useLayoutEffect(() => {
    cameraControlsRef.current?.truck(0, -CAMERA_VERTICAL_OFFSET);

    return () => {
      cameraControlsRef.current?.truck(0, CAMERA_VERTICAL_OFFSET);
    };
  }, []);

  return (
    <CameraControls
      makeDefault
      azimuthAngle={Math.PI * 0.7}
      maxPolarAngle={Math.PI * 0.45}
      polarAngle={Math.PI * 0.3}
      distance={50}
      minDistance={1}
      maxDistance={80}
      ref={cameraControlsRef}
    />
  );
}

function Effects() {
  return (
    <>
      <directionalLight
        position={[-12, 16, -8]}
        intensity={3}
        castShadow
        shadow-normalBias={0.06}
      />
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
      <SoftShadows size={50} />
    </>
  );
}

function Example() {
  const updateMyPresense = useUpdateMyPresence();

  const handlePointerLeave = useCallback(() => {
    updateMyPresense({
      cursor: null,
    });
  }, []);

  return (
    <Canvas
      shadows
      className="canvas"
      dpr={[1, 2]}
      camera={{
        fov: 10,
      }}
      onPointerLeave={handlePointerLeave}
    >
      <Scene />
      <Camera />
      <Effects />
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
      <RoomProvider
        id={roomId}
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
