import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { actions } from "@liveblocks/redux";
import {
  insertRectangle,
  onShapePointerDown,
  deleteShape,
  onCanvasPointerUp,
  onCanvasPointerMove,
  client,
} from "./store";
import "./App.css";

const roomId = "redux-whiteboard";

export default function App() {
  const shapes = useSelector((state) => state.shapes);
  const isLoading = useSelector((state) => state.liveblocks.isStorageLoading);
  const selectedShape = useSelector((state) => state.selectedShape);
  const others = useSelector((state) => state.liveblocks.others);

  const dispatch = useDispatch();

  useEffect(() => {
    dispatch(
      actions.enterRoom(roomId, {
        shapes: {},
      })
    );

    return () => {
      dispatch(actions.leaveRoom(roomId));
    };
  }, [dispatch]);

  if (isLoading) {
    return null;
  }

  return (
    <>
      <div
        className="canvas"
        onPointerMove={(e) => {
          e.preventDefault();
          dispatch(onCanvasPointerMove({ x: e.clientX, y: e.clientY }));
        }}
        onPointerUp={() => {
          dispatch(onCanvasPointerUp());
          client.getRoom(roomId).history.resume();
        }}
      >
        {Object.entries(shapes).map(([shapeId, shape]) => {
          let selectionColor = "transparent";

          if (selectedShape === shapeId) {
            selectionColor = "blue";
          } else if (
            others.some((user) => user.presence?.selectedShape === shapeId)
          ) {
            selectionColor = "green";
          }

          return (
            <Rectangle
              key={shapeId}
              id={shapeId}
              shape={shape}
              selectionColor={selectionColor}
            />
          );
        })}
      </div>
      <div className="toolbar">
        <button onClick={() => dispatch(insertRectangle())}>Rectangle</button>
        <button
          onClick={() => dispatch(deleteShape())}
          disabled={selectedShape == null}
        >
          Delete
        </button>
        <button onClick={() => client.getRoom(roomId).history.undo()}>
          Undo
        </button>
        <button onClick={() => client.getRoom(roomId).history.redo()}>
          Redo
        </button>
      </div>
    </>
  );
}

const Rectangle = ({ shape, selectionColor, id }) => {
  const dispatch = useDispatch();

  return (
    <div
      className="rectangle"
      style={{
        transform: `translate(${shape.x}px, ${shape.y}px)`,
        backgroundColor: shape.fill ? shape.fill : "#CCC",
        borderColor: selectionColor,
      }}
      onPointerDown={(e) => {
        e.stopPropagation();
        client.getRoom(roomId).history.pause();
        dispatch(onShapePointerDown(id));
      }}
    />
  );
};
