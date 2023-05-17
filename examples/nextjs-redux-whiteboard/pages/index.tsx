import { useEffect, useMemo } from "react";
import { useRouter } from "next/router";
import { useDispatch, useSelector } from "react-redux";
import { actions } from "@liveblocks/redux";
import {
  insertRectangle,
  onShapePointerDown,
  deleteShape,
  onCanvasPointerUp,
  onCanvasPointerMove,
  client,
  Shape,
  State,
  User
} from "../src/store";
import styles from "./app.module.css";

let roomId = "nextjs-redux-whiteboard";

export default function MyApp() {
  useOverrideRoomId("roomId");
  const shapes = useSelector((state: State) => state.shapes);
  const isLoading = useSelector((state: State) => state.liveblocks?.isStorageLoading);
  const selectedShape = useSelector((state: State) => state.selectedShape);
  const others = useSelector((state: State) => state.liveblocks?.others);

  const dispatch = useDispatch();

  useEffect(() => {
    dispatch(
      actions.enterRoom(roomId)
    );

    return () => {
      dispatch(actions.leaveRoom(roomId));
    };
  }, [dispatch]);

  if (isLoading) {
    return (
      <div className={styles.loading}>
        <img src="https://liveblocks.io/loading.svg" alt="Loading" />
      </div>
    );
  }

  return (
    <>
      <div
        className={styles.canvas}
        onPointerMove={(e) => {
          e.preventDefault();
          dispatch(onCanvasPointerMove({ x: e.clientX, y: e.clientY }));
        }}
        onPointerUp={() => {
          dispatch(onCanvasPointerUp());
          const room = client.getRoom(roomId);
          if (room) {
            const history = room.history;
            if (history) {
              history.resume();
            }
          }
        }}
      >
        {Object.entries(shapes).map(([shapeId, shape]) => {
          let selectionColor = "transparent";

          if (selectedShape === shapeId) {
            selectionColor = "blue";
          } else if (
            others?.some((user: User) => user.presence?.selectedShape === shapeId)
          ) {
            selectionColor = "green";
          }

          return (
            <Rectangle
              key={shapeId}
              id={shapeId}
              shape={shape}
              selectionColor={selectionColor}
              transition={selectedShape !== shapeId}
            />
          );
        })}
      </div>
      {client && roomId && (
      <div className={styles.toolbar}>
        <button onClick={() => dispatch(insertRectangle())}>Rectangle</button>
        <button
          onClick={() => dispatch(deleteShape())}
          disabled={selectedShape == null}
        >
          Delete
        </button>

  <button onClick={() => client.getRoom(roomId)?.history.undo()}>Undo</button>

        <button onClick={() => client.getRoom(roomId)?.history.redo()}>
          Redo
        </button>
      </div>
      )}
    </>
  );
}

interface RectangleProps {
  shape: Shape;
  selectionColor: string;
  id: string;
  transition: boolean;
}

const Rectangle: React.FC<RectangleProps> = ({ shape, selectionColor, id, transition }) => {
  const dispatch = useDispatch();

  return (
    <div
      className={styles.rectangle}
      style={{
        transform: `translate(${shape.x}px, ${shape.y}px)`,
        transition: transition ? "transform 120ms linear" : "none",
        backgroundColor: shape.fill ? shape.fill : "#CCC",
        borderColor: selectionColor,
      }}
      onPointerDown={(e) => {
        e.stopPropagation();
        client.getRoom(roomId)?.history.pause();
        dispatch(onShapePointerDown(id));
      }}
    />
  );
};

/**
 * This function is used when deploying an example on liveblocks.io.
 * You can ignore it completely if you run the example locally.
 */
function useOverrideRoomId(roomId: string) {
  const { query } = useRouter();
  const overrideRoomId = useMemo(() => {
    return query?.roomId ? `${roomId}-${query.roomId}` : roomId;
  }, [query, roomId]);

  return overrideRoomId;
}