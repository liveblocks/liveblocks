import {
  useMyPresence,
  useOthers,
  useList,
  RoomProvider,
  useMap,
  useHistory,
  useBatch,
} from "@liveblocks/react";
import { LiveList, LiveMap, LiveObject } from "@liveblocks/client";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Color,
  Layer,
  LayerType,
  CanvasState,
  CanvasMode,
  Presence,
  Camera,
  Side,
  XYWH,
  Point,
} from "./types";
import styles from "./index.module.css";
import {
  colorToCss,
  connectionIdToColor,
  findIntersectingLayersWithRectangle,
  getSelectedLayers,
  penPointsToPathLayer,
  pointerEventToCanvasPoint,
  resizeBounds,
} from "./utils";
import SelectionBox from "./components/SelectionBox";
import { nanoid } from "nanoid";
import LayerComponent from "./components/LayerComponent";
import SelectionTools from "./components/SelectionTools";
import useSelectionBounds from "./hooks/useSelectionBounds";
import useDisableScrollBounce from "./hooks/useDisableScrollBounce";
import MultiplayerGuides from "./components/MultiplayerGuides";
import Path from "./components/Path";
import ToolsBar from "./components/ToolsBar";

const MAX_LAYERS = 100;

export default function Room() {
  return (
    <RoomProvider
      id={"multiplayer-canvas"}
      defaultPresence={() => ({
        selection: [],
        cursor: null,
        pencilDraft: null,
        penColor: null,
      })}
    >
      <div className={styles.container}>
        <WhiteboardTool />
      </div>
    </RoomProvider>
  );
}

function WhiteboardTool() {
  // layers is a LiveMap that contains all the shapes drawn on the canvas
  const layers = useMap<string, LiveObject<Layer>>("layers");
  // layerIds is LiveList of all the layer ids ordered by their z-index
  const layerIds = useList<string>("layerIds");

  if (layerIds == null || layers == null) {
    return null;
  }

  return <Canvas layers={layers} layerIds={layerIds} />;
}

function Canvas({
  layerIds,
  layers,
}: {
  layerIds: LiveList<string>;
  layers: LiveMap<string, LiveObject<Layer>>;
}) {
  const [{ selection, pencilDraft }, setPresence] = useMyPresence<Presence>();
  const [canvasState, setState] = useState<CanvasState>({
    mode: CanvasMode.None,
  });
  const [camera, setCamera] = useState<Camera>({ x: 0, y: 0 });
  const [lastUsedColor, setLastUsedColor] = useState<Color>({
    r: 252,
    g: 142,
    b: 42,
  });
  const batch = useBatch();
  const history = useHistory();

  const selectionBounds = useSelectionBounds(layers, selection);

  useDisableScrollBounce();

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
    function onKeyDown(e: KeyboardEvent) {
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
      }
    }

    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [selection, deleteLayers, history]);

  /**
   * Change the color of all the selected layers
   */
  const setFill = useCallback(
    (fill: Color) => {
      setLastUsedColor(fill);
      const selectedLayers = getSelectedLayers(layers, selection);
      batch(() => {
        for (const layer of selectedLayers) {
          layer.set("fill", fill);
        }
      });
    },
    [layers, selection, setLastUsedColor]
  );

  /**
   * Select the layer if not already selected and start translating the selection
   */
  const onLayerPointerDown = useCallback(
    (e: React.PointerEvent, layerId: string) => {
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

  /**
   * Move all the selected layers to the front
   */
  const moveToFront = useCallback(() => {
    batch(() => {
      const indices: number[] = [];

      const arr = layerIds.toArray();

      for (let i = 0; i < arr.length; i++) {
        if (selection.includes(arr[i])) {
          indices.push(i);
        }
      }

      for (let i = indices.length - 1; i >= 0; i--) {
        layerIds.move(indices[i], arr.length - 1 - (indices.length - 1 - i));
      }
    });
  }, [layerIds, selection]);

  /**
   * Move all the selected layers to the back
   */
  const moveToBack = useCallback(() => {
    batch(() => {
      const indices: number[] = [];

      const arr = layerIds.toArray();

      for (let i = 0; i < arr.length; i++) {
        if (selection.includes(arr[i])) {
          indices.push(i);
        }
      }

      for (let i = 0; i < indices.length; i++) {
        layerIds.move(indices[i], i);
      }
    });
  }, [layerIds, selection]);

  /**
   * Start resizing the layer
   */
  const onResizeHandlePointerDown = useCallback(
    (corner: Side, initialBounds: XYWH) => {
      history.pause();
      setState({
        mode: CanvasMode.Resizing,
        initialBounds,
        corner,
      });
    },
    [history]
  );

  /**
   * Insert an ellipse or a rectangle at the given position and select it
   */
  const insertLayer = useCallback(
    (layerType: LayerType.Ellipse | LayerType.Rectangle, position: Point) => {
      if (layers.size >= MAX_LAYERS) {
        return;
      }

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

  /**
   * Transform the drawing of the current user in a layer and reset the presence to delete the draft.
   */
  const insertPath = useCallback(() => {
    if (
      pencilDraft == null ||
      pencilDraft.length < 2 ||
      layers.size >= MAX_LAYERS
    ) {
      setPresence({ pencilDraft: null });
      return;
    }

    batch(() => {
      const id = nanoid();
      layers.set(
        id,
        new LiveObject(penPointsToPathLayer(pencilDraft, lastUsedColor))
      );
      layerIds.push(id);
      setPresence({ pencilDraft: null });
      setState({ mode: CanvasMode.Pencil });
    });
  }, [layers, setPresence, batch, layerIds, lastUsedColor, pencilDraft]);

  /**
   * Move selected layers on the canvas
   */
  const translateSelectedLayers = useCallback(
    (point: Point) => {
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

  /**
   * Resize selected layer. Only resizing a single layer is allowed.
   */
  const resizeSelectedLayer = useCallback(
    (point: Point) => {
      if (canvasState.mode !== CanvasMode.Resizing) {
        return;
      }

      const bounds = resizeBounds(
        canvasState.initialBounds,
        canvasState.corner,
        point
      );

      const layer = layers.get(selection[0]);
      if (layer) {
        layer.update(bounds);
      }
    },
    [canvasState, layers]
  );

  const unselectLayers = useCallback(() => {
    setPresence({ selection: [] }, { addToHistory: true });
  }, [setPresence]);

  /**
   * Insert the first path point and start drawing with the pencil
   */
  const startDrawing = useCallback(
    (point: Point, pressure: number) => {
      setPresence({
        pencilDraft: [[point.x, point.y, pressure]],
        penColor: lastUsedColor,
      });
    },
    [setPresence]
  );

  /**
   * Continue the drawing and send the current draft to other users in the room
   */
  const continueDrawing = useCallback(
    (point: Point, e: React.PointerEvent) => {
      if (
        canvasState.mode !== CanvasMode.Pencil ||
        e.buttons !== 1 ||
        pencilDraft == null
      ) {
        return;
      }

      setPresence({
        cursor: point,
        pencilDraft:
          pencilDraft.length === 1 &&
          pencilDraft[0][0] === point.x &&
          pencilDraft[0][1] === point.y
            ? pencilDraft
            : [...pencilDraft, [point.x, point.y, e.pressure]],
      });
    },
    [canvasState.mode, setPresence, pencilDraft]
  );

  /**
   * Start multiselection with the selection net if the pointer move enough since pressed
   */
  const startMultiSelection = useCallback((current: Point, origin: Point) => {
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
    (current: Point, origin: Point) => {
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

  // TODO: Expose a hook to observe only one key of the others presence to improve performance
  // For example, multiplayer selection should not be re-render if only a cursor move
  const others = useOthers<Presence>();

  /**
   * Create a map layerId to color based on the selection of all the users in the room
   */
  const layerIdsToColorSelection = useMemo(() => {
    const layerIdsToColorSelection: Record<string, string> = {};

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

  return (
    <>
      <div className={styles.canvas}>
        {selectionBounds && (
          <SelectionTools
            isAnimated={
              canvasState.mode !== CanvasMode.Translating &&
              canvasState.mode !== CanvasMode.Resizing
            }
            x={selectionBounds.width / 2 + selectionBounds.x + camera.x}
            y={selectionBounds.y + camera.y}
            setFill={setFill}
            moveToFront={moveToFront}
            moveToBack={moveToBack}
            deleteItems={deleteLayers}
          />
        )}
        <svg
          className={styles.renderer_svg}
          onWheel={(e) => {
            // Pan the camera based on the wheel delta
            setCamera((camera) => ({
              x: camera.x - e.deltaX,
              y: camera.y - e.deltaY,
            }));
          }}
          onPointerDown={(e) => {
            const point = pointerEventToCanvasPoint(e, camera);

            if (canvasState.mode === CanvasMode.Inserting) {
              return;
            }

            if (canvasState.mode === CanvasMode.Pencil) {
              startDrawing(point, e.pressure);
              return;
            }

            setState({ origin: point, mode: CanvasMode.Pressing });
          }}
          onPointerLeave={() => {
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
            } else if (canvasState.mode === CanvasMode.Resizing) {
              resizeSelectedLayer(current);
            } else if (canvasState.mode === CanvasMode.Pencil) {
              continueDrawing(current, e);
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
            } else if (canvasState.mode === CanvasMode.Pencil) {
              insertPath();
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
          <g
            style={{
              transform: `translate(${camera.x}px, ${camera.y}px)`,
            }}
          >
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
            {/* Blue square that show the selection of the current users. Also contains the resize handles. */}
            {selectionBounds && (
              <SelectionBox
                selection={selection}
                bounds={selectionBounds}
                layers={layers}
                onResizeHandlePointerDown={onResizeHandlePointerDown}
                isAnimated={
                  canvasState.mode !== CanvasMode.Translating &&
                  canvasState.mode !== CanvasMode.Resizing
                }
              />
            )}
            {/* Selection net that appears when the user is selecting multiple layers at once */}
            {canvasState.mode === CanvasMode.SelectionNet &&
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
              )}
            <MultiplayerGuides />
            {/* Drawing in progress. Still not commited to the storage. */}
            {pencilDraft != null && pencilDraft.length > 0 && (
              <Path
                points={pencilDraft}
                fill={colorToCss(lastUsedColor)}
                x={0}
                y={0}
              />
            )}
          </g>
        </svg>
      </div>
      <ToolsBar
        canvasState={canvasState}
        setCanvasState={setState}
        undo={history.undo}
        redo={history.redo}
      />
    </>
  );
}
