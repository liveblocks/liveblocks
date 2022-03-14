import { useState, useCallback, useEffect, memo } from "react";
import {
  useMyPresence,
  useMap,
  useHistory,
  useBatch,
  useSelf,
  useRoom,
} from "@liveblocks/react";
import { LiveObject } from "@liveblocks/client";
import { nanoid } from "nanoid";

import "./App.css";

const COLORS = ["#DC2626", "#D97706", "#059669", "#7C3AED", "#DB2777"];

function connectionIdToColor(connectionId) {
  return COLORS[connectionId % COLORS.length];
}

export default function App() {
  const layers = useMap("layers");

  if (layers == null) {
    return <div>Loading</div>;
  }

  return <Canvas layers={layers} />;
}

function Canvas({ layers }) {
  const [{ selection, cursor }, setPresence] = useMyPresence();
  const [canvasState, setState] = useState({
    isDragging: false,
  });

  const batch = useBatch();
  const history = useHistory();
  const me = useSelf();

  const myColor = connectionIdToColor(me.connectionId);

  const insertLayer = useCallback(
    (position) => {
      batch(() => {
        const layerId = nanoid();
        const layer = new LiveObject({
          type: "rectangle",
          x: position.x,
          y: position.y,
          height: 100,
          width: 100,
          fill: myColor,
        });
        layers.set(layerId, layer);
        setPresence({ selection: layerId }, { addToHistory: true });
      });
    },
    [batch, layers, setPresence, myColor]
  );

  const deleteSelectedLayer = useCallback(() => {
    batch(() => {
      layers.delete(selection);
    });
  }, [layers, selection]);

  useEffect(() => {
    function onKeyDown(e) {
      switch (e.key) {
        case "Backspace": {
          deleteSelectedLayer();
          break;
        }
        case "z": {
          if (e.ctrlKey || e.metaKey) {
            if (e.shiftKey) {
              history.redo();
            } else {
              history.undo();
            }
            break;
          }
        }
        case "i": {
          const point = {
            x: cursor.x,
            y: cursor.y,
          };
          insertLayer(point);
        }
      }
    }

    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [selection, cursor, history, insertLayer, deleteSelectedLayer]);

  const onLayerPointerDown = useCallback(
    (e, layerId) => {
      history.pause();
      e.stopPropagation();
      const point = {
        x: Math.round(e.clientX),
        y: Math.round(e.clientY),
      };

      setPresence({ selection: layerId }, { addToHistory: true });

      setState({ isDragging: true, current: point });
    },
    [setPresence, setState, selection, history]
  );

  const unselectLayer = useCallback(() => {
    setPresence({ selection: null }, { addToHistory: true });
  }, [setPresence]);

  const translateSelectedLayer = useCallback(
    (point) => {
      const layer = layers.get(selection);
      if (layer) {
        layer.update({
          x: layer.get("x") + point.x - canvasState.current.x,
          y: layer.get("y") + point.y - canvasState.current.y,
        });
      }

      setState({ ...canvasState, current: point });
    },
    [layers, canvasState, selection]
  );

  const onCanvasPointerUp = useCallback(
    (e) => {
      if (!canvasState.isDragging) {
        unselectLayer();
      }

      setState({
        isDragging: false,
      });

      history.resume();
    },
    [canvasState.isDragging, history]
  );

  const onCanvasPointerMove = useCallback(
    (e) => {
      e.preventDefault();
      const current = {
        x: Math.round(e.clientX),
        y: Math.round(e.clientY),
      };

      if (canvasState.isDragging) {
        translateSelectedLayer(current);
      }
      setPresence({ cursor: current });
    },
    [canvasState.isDragging, setPresence, translateSelectedLayer]
  );

  return (
    <>
      <div
        className="canvas"
        onPointerMove={onCanvasPointerMove}
        onPointerUp={onCanvasPointerUp}
      >
        {Array.from(layers, ([layerId, layer]) => {
          return (
            <LayerComponent
              key={layerId}
              id={layerId}
              mode={canvasState.mode}
              onLayerPointerDown={onLayerPointerDown}
              layer={layer}
              selectionColor={selection === layerId ? "blue" : undefined}
            />
          );
        })}
      </div>
    </>
  );
}

const LayerComponent = memo(
  ({ layer, onLayerPointerDown, id, selectionColor }) => {
    const [layerData, setLayerData] = useState(layer.toObject());

    const room = useRoom();

    useEffect(() => {
      function onChange() {
        setLayerData(layer.toObject());
      }

      return room.subscribe(layer, onChange);
    }, [room, layer]);

    return (
      <div
        onPointerDown={(e) => onLayerPointerDown(e, id)}
        style={{
          transition: "all 0.1s ease",
          transform: `translate(${layerData.x}px, ${layerData.y}px)`,
          height: layerData.height,
          width: layerData.width,
          backgroundColor: layerData.fill ? layerData.fill : "#CCC",
          borderColor: selectionColor || "transparent",
          strokeWidth: 1,
          borderStyle: "solid",
          borderWidth: "2px",
        }}
      ></div>
    );
  }
);
