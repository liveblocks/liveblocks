import { useState, useCallback, useEffect } from "react";
import {
  useMyPresence,
  RoomProvider,
  useMap,
  useHistory,
  useBatch,
  useSelf,
} from "@liveblocks/react";
import { LiveObject } from "@liveblocks/client";
import { nanoid } from "nanoid";

import "./App.css";

import LayerComponent from "./LayerComponent";

const CanvasMode = {
  None: "None",
  Translating: "Translating",
  Inserting: "Inserting",
};

const COLORS = ["#DC2626", "#D97706", "#059669", "#7C3AED", "#DB2777"];

function connectionIdToColor(connectionId) {
  return COLORS[connectionId % COLORS.length];
}

export default function App() {
  return (
    <RoomProvider
      id="react-whiteboard"
      defaultPresence={() => ({
        selection: [],
      })}
    >
      <div>
        <Whiteboard />
      </div>
    </RoomProvider>
  );
}

function Whiteboard() {
  const layers = useMap("layers");

  if (layers == null) {
    return <div>Loading</div>;
  }

  return <Canvas layers={layers} />;
}

function Canvas({ layers }) {
  const [{ selection }, setPresence] = useMyPresence();
  const [canvasState, setState] = useState({
    mode: CanvasMode.None,
  });

  const batch = useBatch();
  const history = useHistory();

  const me = useSelf();

  const myColor = connectionIdToColor(me.connectionId);

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
          setState({ mode: CanvasMode.Inserting });
        }
      }
    }

    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [selection, , history, deleteSelectedLayer]);

  const onLayerPointerDown = useCallback(
    (e, layerId) => {
      if (canvasState.mode === CanvasMode.Inserting) {
        return;
      }

      history.pause();
      e.stopPropagation();
      const point = {
        x: Math.round(e.clientX),
        y: Math.round(e.clientY),
      };

      setPresence({ selection: layerId }, { addToHistory: true });

      setState({ mode: CanvasMode.Translating, current: point });
    },
    [setPresence, setState, selection, history, canvasState.mode]
  );

  const insertLayer = useCallback(
    (layerType, position) => {
      batch(() => {
        const layerId = nanoid();
        const layer = new LiveObject({
          type: layerType,
          x: position.x,
          y: position.y,
          height: 100,
          width: 100,
          fill: myColor,
        });
        layers.set(layerId, layer);
        setPresence({ selection: layerId }, { addToHistory: true });
        setState({ mode: CanvasMode.None });
      });
    },
    [batch, layers, setPresence, myColor]
  );

  const unselectLayer = useCallback(() => {
    setPresence({ selection: null }, { addToHistory: true });
  }, [setPresence]);

  const translateSelectedLayer = useCallback(
    (point) => {
      if (canvasState.mode !== CanvasMode.Translating) {
        return;
      }

      const layer = layers.get(selection);
      if (layer) {
        layer.update({
          x: layer.get("x") + point.x - canvasState.current.x,
          y: layer.get("y") + point.y - canvasState.current.y,
        });
      }

      setState({ mode: CanvasMode.Translating, current: point });
    },
    [layers, canvasState, selection]
  );

  const onCanvasPointerUp = (e) => {
    if (canvasState.mode === CanvasMode.None) {
      unselectLayer();
      setState({
        mode: CanvasMode.None,
      });
    } else if (canvasState.mode === CanvasMode.Inserting) {
      const point = {
        x: Math.round(e.clientX),
        y: Math.round(e.clientY),
      };
      insertLayer(canvasState.layerType, point);
    } else {
      setState({
        mode: CanvasMode.None,
      });
    }
    history.resume();
  };

  const onCanvasPointerMove = (e) => {
    e.preventDefault();
    const current = {
      x: Math.round(e.clientX),
      y: Math.round(e.clientY),
    };
    if (canvasState.mode === CanvasMode.Translating) {
      translateSelectedLayer(current);
    }
    setPresence({ cursor: current });
  };

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
