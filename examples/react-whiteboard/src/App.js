import { useState, useMemo, useCallback, useEffect } from "react";
import {
  useMyPresence,
  useOthers,
  useList,
  RoomProvider,
  useMap,
  useHistory,
  useBatch,
  useRoom,
} from "@liveblocks/react";
import { LiveObject } from "@liveblocks/client";
import { nanoid } from "nanoid";

import "./App.css";

import LayerComponent from "./LayerComponent";
import SelectionBox from "./SelectionBox";

import {
  CanvasMode,
  connectionIdToColor,
  pointerEventToCanvasPoint,
  findIntersectingLayersWithRectangle,
  boundingBox,
} from "./utils";

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
  const [camera, setCamera] = useState({ x: 0, y: 0 });
  const [lastUsedColor, setLastUsedColor] = useState({
    r: 252,
    g: 142,
    b: 42,
  });
  const batch = useBatch();
  const history = useHistory();

  const others = useOthers();

  const selectionBounds = useSelectionBounds(layers, selection);

  /**
   * Delete all the selected layers.
   */
  const deleteLayers = useCallback(() => {
    batch(() => {
      for (const id of selection) {
        // Delete the layer from the layers LiveMap
        layers.delete(id);
        // Find the layer index in the z-index list and remove it
        const index = layerIds.indexOf(id);
        if (index !== -1) {
          layerIds.delete(index);
        }
      }
    });
  }, [layerIds, layers, selection]);

  /**
   * Hook used to listen to Undo / Redo and delete selected layers
   */
  useEffect(() => {
    function onKeyDown(e) {
      switch (e.key) {
        case "Backspace": {
          deleteLayers();
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
  }, [selection, , history, deleteLayers]); // deleteLayers

  const layerIdsToColorSelection = useMemo(() => {
    const layerIdsToColorSelection = {};

    const users = others.toArray();
    for (const user of users) {
      const selection = user.presence?.selection;
      if (selection == null || selection.length === 0) {
        continue;
      }

      for (const id of selection) {
        layerIdsToColorSelection[id] = connectionIdToColor(user.connectionId);
      }
    }

    return layerIdsToColorSelection;
  }, [others]);

  const onLayerPointerDown = useCallback(
    (e, layerId) => {
      if (
        canvasState.mode === CanvasMode.Pencil ||
        canvasState.mode === CanvasMode.Inserting
      ) {
        return;
      }

      history.pause();
      e.stopPropagation();
      const point = pointerEventToCanvasPoint(e, camera);
      if (!selection.includes(layerId)) {
        setPresence({ selection: [layerId] }, { addToHistory: true });
      }
      setState({ mode: CanvasMode.Translating, current: point });
    },
    [setPresence, setState, selection, camera, history, canvasState.mode]
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
          fill: lastUsedColor,
        });
        layerIds.push(layerId);
        layers.set(layerId, layer);
        setPresence({ selection: [layerId] }, { addToHistory: true });
        setState({ mode: CanvasMode.None });
      });
    },
    [batch, layerIds, layers, setPresence, lastUsedColor]
  );

  const unselectLayers = useCallback(() => {
    setPresence({ selection: [] }, { addToHistory: true });
  }, [setPresence]);

  /**
   * Start multiselection with the selection net if the pointer move enough since pressed
   */
  const startMultiSelection = useCallback((current, origin) => {
    // If the distance between the pointer position and the pointer position when it was pressed
    if (Math.abs(current.x - origin.x) + Math.abs(current.y - origin.y) > 5) {
      // Start multi selection
      setState({
        mode: CanvasMode.SelectionNet,
        origin,
        current,
      });
    }
  }, []);

  /**
   * Update the position of the selection net and select the layers accordingly
   */
  const updateSelectionNet = useCallback(
    (current, origin) => {
      setState({
        mode: CanvasMode.SelectionNet,
        origin: origin,
        current,
      });
      const ids = findIntersectingLayersWithRectangle(
        layerIds,
        layers,
        origin,
        current
      );
      setPresence({ selection: ids });
    },
    [layers, layerIds, setPresence]
  );

  /**
   * Move selected layers on the canvas
   */
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

        for (const id of selection) {
          const layer = layers.get(id);
          if (layer) {
            layer.update({
              x: layer.get("x") + offset.x,
              y: layer.get("y") + offset.y,
            });
          }
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
          onPointerDown={(e) => {
            const point = pointerEventToCanvasPoint(e, camera);

            if (canvasState.mode === CanvasMode.Inserting) {
              return;
            }

            setState({ origin: point, mode: CanvasMode.Pressing });
          }}
          onPointerLeave={(e) => {
            setPresence({ cursor: null });
          }}
          onPointerMove={(e) => {
            e.preventDefault();
            const current = pointerEventToCanvasPoint(e, camera);
            if (canvasState.mode === CanvasMode.Pressing) {
              startMultiSelection(current, canvasState.origin);
            } else if (canvasState.mode === CanvasMode.SelectionNet) {
              updateSelectionNet(current, canvasState.origin);
            } else if (canvasState.mode === CanvasMode.Translating) {
              translateSelectedLayers(current);
            }
            setPresence({ cursor: current });
          }}
          onPointerUp={(e) => {
            const point = pointerEventToCanvasPoint(e, camera);
            if (
              canvasState.mode === CanvasMode.None ||
              canvasState.mode === CanvasMode.Pressing
            ) {
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
                  selectionColor={layerIdsToColorSelection[layerId]}
                />
              );
            })}
            {/* Blue square that show the selection of the current users. */}
            {selectionBounds && (
              <SelectionBox
                selection={selection}
                bounds={selectionBounds}
                layers={layers}
                isAnimated={
                  canvasState.mode !== CanvasMode.Translating &&
                  canvasState.mode !== CanvasMode.Resizing
                }
              />
            )}
            {/* Selection net that appears when the user is selecting multiple layers at once */}
            {/* {canvasState.mode === CanvasMode.SelectionNet &&
              canvasState.current != null && (
                <rect
                  className={styles.selection_net}
                  x={Math.min(canvasState.origin.x, canvasState.current.x)}
                  y={Math.min(canvasState.origin.y, canvasState.current.y)}
                  width={Math.abs(canvasState.origin.x - canvasState.current.x)}
                  height={Math.abs(
                    canvasState.origin.y - canvasState.current.y
                  )}
                />
              )} */}
            {/* <MultiplayerGuides /> */}
          </g>
        </svg>
      </div>
    </>
  );
}

function useSelectionBounds(layers, selection) {
  const [bounds, setBounds] = useState(boundingBox(layers, selection));
  const room = useRoom();

  useEffect(() => {
    function onChange() {
      setBounds(boundingBox(layers, selection));
    }

    onChange();

    // We need to subscribe to the layers map updates and to the updates on the layers themselves.
    // If User A deletes or modified a layer that is currently selected by UserB, the selection bounds needs to be refreshed.
    return room.subscribe(layers, onChange, { isDeep: true });
  }, [room, layers, selection]);

  return bounds;
}
