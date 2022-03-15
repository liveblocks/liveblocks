import { useState, useEffect, memo } from "react";
import {
  useMyPresence,
  useMap,
  useHistory,
  useBatch,
  useSelf,
  useRoom,
} from "@liveblocks/react";
import { LiveObject } from "@liveblocks/client";

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
  const [isDragging, setIsDragging] = useState(false);

  const [{ selectedLayer }, setPresence] = useMyPresence();
  const batch = useBatch();
  const history = useHistory();
  const me = useSelf();

  const myColor = connectionIdToColor(me.connectionId);

  const insertLayer = () => {
    batch(() => {
      const layerId = Date.now() + Math.random() * 100;
      const layer = new LiveObject({
        x: Math.floor(Math.random() * 300),
        y: Math.floor(Math.random() * 300),
        fill: myColor,
      });
      layers.set(layerId, layer);
      setPresence({ selectedLayer: layerId }, { addToHistory: true });
    });
  };

  useEffect(() => {
    function onKeyDown(e) {
      switch (e.key) {
        case "Backspace": {
          layers.delete(selectedLayer);
          setPresence({ selectedLayer: null });
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
          insertLayer();
        }
      }
    }

    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [history, insertLayer, layers, selectedLayer, setPresence]);

  const onLayerPointerDown = (e, layerId) => {
    history.pause();
    e.stopPropagation();

    setPresence({ selectedLayer: layerId }, { addToHistory: true });

    setIsDragging(true);
  };

  const onCanvasPointerUp = (e) => {
    if (!isDragging) {
      setPresence({ selectedLayer: null }, { addToHistory: true });
    }

    setIsDragging(false);

    history.resume();
  };

  const onCanvasPointerMove = (e) => {
    e.preventDefault();

    if (isDragging) {
      const layer = layers.get(selectedLayer);
      if (layer) {
        console.log(e);
        layer.update({
          x: e.clientX - 50,
          y: e.clientY - 50,
        });
      }
    }
  };

  return (
    <div
      className="canvas"
      onPointerMove={onCanvasPointerMove}
      onPointerUp={onCanvasPointerUp}
    >
      {Array.from(layers, ([layerId, layer]) => {
        return (
          <Rectangle
            key={layerId}
            id={layerId}
            onLayerPointerDown={onLayerPointerDown}
            layer={layer}
            selectionColor={selectedLayer === layerId ? "blue" : undefined}
          />
        );
      })}
    </div>
  );
}

const Rectangle = memo(({ layer, id, onLayerPointerDown, selectionColor }) => {
  const [{ x, y, fill }, setLayerData] = useState(layer.toObject());

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
      className={"rectangle"}
      style={{
        transform: `translate(${x}px, ${y}px)`,
        backgroundColor: fill ? fill : "#CCC",
        borderColor: selectionColor || "transparent",
      }}
    ></div>
  );
});
