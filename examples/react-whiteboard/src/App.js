import { useState, useCallback, useEffect } from "react";
import {
  useMyPresence,
  useOthers,
  useList,
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
  SelectionNe: "SelectionNet",
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
  const layerIds = useList("layerIds");

  if (layerIds == null || layers == null) {
    return <div>Loading</div>;
  }

  return <Canvas layers={layers} layerIds={layerIds} />;
}

function Canvas({ layerIds, layers }) {
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
      // Delete the layer from the layers LiveMap
      layers.delete(selection);
      // Find the layer index in the z-index list and remove it
      const index = layerIds.indexOf(selection);
      if (index !== -1) {
        layerIds.delete(index);
      }
    });
  }, [layerIds, layers, selection]);

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
        layerIds.push(layerId);
        layers.set(layerId, layer);
        setPresence({ selection: layerId }, { addToHistory: true });
        setState({ mode: CanvasMode.None });
      });
    },
    [batch, layerIds, layers, setPresence, myColor]
  );

  const unselectLayers = useCallback(() => {
    setPresence({ selection: null }, { addToHistory: true });
  }, [setPresence]);

  const translateSelectedLayers = useCallback(
    (point) => {
      if (canvasState.mode !== CanvasMode.Translating) {
        return;
      }

      batch(() => {
        const offset = {
          x: point.x - canvasState.current.x,
          y: point.y - canvasState.current.y,
        };

        const layer = layers.get(selection);
        if (layer) {
          layer.update({
            x: layer.get("x") + offset.x,
            y: layer.get("y") + offset.y,
          });
        }

        setState({ mode: CanvasMode.Translating, current: point });
      });
    },
    [layers, canvasState, selection, batch]
  );

  return (
    <>
      <div className="canvas">
        <svg
          className="renderer_svg"
          onPointerLeave={(e) => {
            setPresence({ cursor: null });
          }}
          onPointerMove={(e) => {
            e.preventDefault();
            const current = {
              x: Math.round(e.clientX),
              y: Math.round(e.clientY),
            };
            if (canvasState.mode === CanvasMode.Translating) {
              translateSelectedLayers(current);
            }
            setPresence({ cursor: current });
          }}
          onPointerUp={(e) => {
            const point = {
              x: Math.round(e.clientX),
              y: Math.round(e.clientY),
            };
            if (canvasState.mode === CanvasMode.None) {
              unselectLayers();
              setState({
                mode: CanvasMode.None,
              });
            } else if (canvasState.mode === CanvasMode.Inserting) {
              insertLayer(canvasState.layerType, point);
            } else {
              setState({
                mode: CanvasMode.None,
              });
            }
            history.resume();
          }}
        >
          <g>
            {layerIds.map((layerId) => {
              const layer = layers.get(layerId);
              if (layer == null) {
                return null;
              }

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
          </g>
        </svg>
      </div>
    </>
  );
}
