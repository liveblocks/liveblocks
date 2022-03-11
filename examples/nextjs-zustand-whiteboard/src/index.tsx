import React, { useCallback, useEffect } from "react";
import styles from "./index.module.css";
import useStore from "./store";
import shallow from "zustand/shallow";
import Cursors from "./Cursors";
import ToolsBar from "./ToolsBar";

export default function Whiteboard() {
  const {
    selectedLayerId,
    layers,
    onKeyDown,
    onPointerMove,
    onPointerUp,
    onDocumentPointerLeave,
  } = useStore(
    (state) => ({
      selectedLayerId: state.selectedLayerId,
      layers: state.layers,
      onPointerMove: state.onCanvasPointerMove,
      onPointerUp: state.onCanvasPointerUp,
      onKeyDown: state.onKeyDown,
      onDocumentPointerLeave: state.onDocumentPointerLeave,
    }),
    shallow
  );

  useEffect(() => {
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerleave", onDocumentPointerLeave);

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerleave", onDocumentPointerLeave);
    };
  }, [onKeyDown]);

  // Liveblocks integration start
  const { enterRoom, leaveRoom, isLoading } = useStore(
    (state) => ({
      enterRoom: state.liveblocks.enterRoom,
      leaveRoom: state.liveblocks.leaveRoom,
      isLoading: state.liveblocks.isStorageLoading,
    }),
    shallow
  );

  useEffect(() => {
    enterRoom("zustand-whiteboard", { layers: {} });

    return () => {
      leaveRoom("zustand-whiteboard");
    };
  }, [enterRoom, leaveRoom]);

  if (isLoading) {
    return <div>Loading...</div>;
  }
  // Liveblocks integration end

  return (
    <>
      <div
        className={styles.canvas}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
      >
        <div style={{ position: "absolute" }}>
          Shortcuts: <br />
          "R": Insert Rectangle <br />
          "O": Insert Circle <br />
          "Backspace": Delete selected layer <br />
        </div>
        {Object.keys(layers).map((id) => (
          <Layer key={id} id={id} isSelected={selectedLayerId == id} />
        ))}
        <ToolsBar />
        <Cursors />
      </div>
    </>
  );
}

type LayerProps = {
  id: string;
  isSelected: boolean;
};

const Layer = React.memo(({ id, isSelected }: LayerProps) => {
  const layer = useStore((state) => state.layers[id]);
  const onLayerPointerDown = useStore((state) => state.onLayerPointerDown);

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      onLayerPointerDown(id, e);
    },
    [onLayerPointerDown, id]
  );

  if (layer == null) {
    return null;
  }

  return (
    <div
      onPointerDown={onPointerDown}
      style={{
        position: "absolute",
        height: layer.height,
        width: layer.width,
        backgroundColor: layer.color,
        borderStyle: "solid",
        borderWidth: "2px",
        borderColor: isSelected ? "blue" : "transparent",
        borderRadius: layer.type === "ellipse" ? "999px" : 0,
        transition: "transform 0.5s cubic-bezier(.17,.93,.38,1)",
        transform: `translateX(${layer.x}px) translateY(${layer.y}px)`,
      }}
    ></div>
  );
});
