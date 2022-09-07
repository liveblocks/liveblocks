import {
  useOtherIds,
  useMutation,
  useUpdateMyPresence,
  useList,
  RoomProvider,
  useMap,
  useHistory,
  useStorage,
  useSelf,
  useBatch,
  useCanUndo,
  useCanRedo,
} from "../liveblocks.config";
import { ClientSideSuspense, shallow } from "@liveblocks/react";
import { LiveList, LiveMap, LiveObject } from "@liveblocks/client";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Color,
  Layer,
  LayerType,
  CanvasState,
  CanvasMode,
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
  getMutableSelectedLayers,
  penPointsToPathLayer,
  pointerEventToCanvasPoint,
  resizeBounds,
} from "./utils";
import SelectionBox from "./components/SelectionBox";
import { nanoid } from "nanoid";
import { useRouter } from "next/router";
import LayerComponent from "./components/LayerComponent";
import SelectionTools from "./components/SelectionTools";
import useSelectionBounds from "./hooks/useSelectionBounds";
import useDisableScrollBounce from "./hooks/useDisableScrollBounce";
import MultiplayerGuides from "./components/MultiplayerGuides";
import Path from "./components/Path";
import ToolsBar from "./components/ToolsBar";

const MAX_LAYERS = 100;

export default function Room() {
  const roomId = useOverrideRoomId("nextjs-whiteboard-advanced");

  return (
    <RoomProvider
      id={roomId}
      initialPresence={{
        selection: [],
        cursor: null,
        pencilDraft: null,
        penColor: null,
      }}
      initialStorage={{
        layers: new LiveMap<string, LiveObject<Layer>>(),
        layerIds: new LiveList(),
      }}
    >
      <div className={styles.container}>
        <ClientSideSuspense fallback={<Loading />}>
          {() => <Canvas />}
        </ClientSideSuspense>
      </div>
    </RoomProvider>
  );
}

function Loading() {
  return (
    <div className={styles.container}>
      <div className={styles.loading}>
        <img src="https://liveblocks.io/loading.svg" alt="Loading" />
      </div>
    </div>
  );
}

function Canvas() {
  // layers is a map that contains all the shapes drawn on the canvas
  const layers = useStorage((root) => root.layers);
  const liveLayers = useMap("layers");
  // layerIds is list of all the layer ids ordered by their z-index
  const layerIds = useStorage((root) => root.layerIds);
  const liveLayerIds = useList("layerIds");

  const { selection, pencilDraft } = useSelf(
    (me) => ({
      selection: me.presence.selection,
      pencilDraft: me.presence.pencilDraft,
    }),
    shallow
  );
  const setPresence = useUpdateMyPresence();
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
  const canUndo = useCanUndo();
  const canRedo = useCanRedo();

  const selectionBounds = useSelectionBounds();

  useDisableScrollBounce();

  /**
   * Delete all the selected layers.
   */
  const deleteLayers = useMutation(
    ({ root }) => {
      const liveLayers = root.get("layers");
      const liveLayerIds = root.get("layerIds");
      for (const id of selection) {
        // Delete the layer from the layers LiveMap
        liveLayers.delete(id);
        // Find the layer index in the z-index list and remove it
        const index = liveLayerIds.indexOf(id);
        if (index !== -1) {
          liveLayerIds.delete(index);
        }
      }
    },
    [selection]
  );

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
  const setFill = useMutation(
    ({ root }, fill: Color) => {
      const liveLayers = root.get("layers");
      setLastUsedColor(fill);
      const selectedLayers = getMutableSelectedLayers(liveLayers, selection);
      for (const layer of selectedLayers) {
        layer.set("fill", fill);
      }
    },
    [selection, setLastUsedColor]
  );

  /**
   * Select the layer if not already selected and start translating the selection
   */
  const onLayerPointerDown = useMutation(
    ({ setMyPresence }, e: React.PointerEvent, layerId: string) => {
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
        setMyPresence({ selection: [layerId] }, { addToHistory: true });
      }
      setState({ mode: CanvasMode.Translating, current: point });
    },
    [setState, selection, camera, history, canvasState.mode]
  );

  /**
   * Move all the selected layers to the front
   */
  const moveToFront = useMutation(
    ({ root }) => {
      const liveLayerIds = root.get("layerIds");
      const indices: number[] = [];

      const arr = liveLayerIds.toArray();

      for (let i = 0; i < arr.length; i++) {
        if (selection.includes(arr[i])) {
          indices.push(i);
        }
      }

      for (let i = indices.length - 1; i >= 0; i--) {
        liveLayerIds.move(
          indices[i],
          arr.length - 1 - (indices.length - 1 - i)
        );
      }
    },
    [selection]
  );

  /**
   * Move all the selected layers to the back
   */
  const moveToBack = useMutation(
    ({ root }) => {
      const liveLayerIds = root.get("layerIds");
      const indices: number[] = [];

      const arr = liveLayerIds.toArray();

      for (let i = 0; i < arr.length; i++) {
        if (selection.includes(arr[i])) {
          indices.push(i);
        }
      }

      for (let i = 0; i < indices.length; i++) {
        liveLayerIds.move(indices[i], i);
      }
    },
    [selection]
  );

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
  const insertLayer = useMutation(
    (
      { root, setMyPresence },
      layerType: LayerType.Ellipse | LayerType.Rectangle,
      position: Point
    ) => {
      const liveLayers = root.get("layers");
      if (liveLayers.size >= MAX_LAYERS) {
        return;
      }

      const liveLayerIds = root.get("layerIds");
      const layerId = nanoid();
      const layer = new LiveObject({
        type: layerType,
        x: position.x,
        y: position.y,
        height: 100,
        width: 100,
        fill: lastUsedColor,
      });
      liveLayerIds.push(layerId);
      liveLayers.set(layerId, layer);

      setMyPresence({ selection: [layerId] }, { addToHistory: true });
      setState({ mode: CanvasMode.None });
    },
    [lastUsedColor]
  );

  /**
   * Transform the drawing of the current user in a layer and reset the presence to delete the draft.
   */
  const insertPath = useMutation(
    ({ root, setMyPresence }) => {
      const liveLayers = root.get("layers");
      if (
        pencilDraft == null ||
        pencilDraft.length < 2 ||
        liveLayers.size >= MAX_LAYERS
      ) {
        setMyPresence({ pencilDraft: null });
        return;
      }

      const id = nanoid();
      liveLayers.set(
        id,
        new LiveObject(penPointsToPathLayer(pencilDraft, lastUsedColor))
      );

      const liveLayerIds = root.get("layerIds");
      liveLayerIds.push(id);
      setMyPresence({ pencilDraft: null });
      setState({ mode: CanvasMode.Pencil });
    },
    [lastUsedColor, pencilDraft]
  );

  /**
   * Move selected layers on the canvas
   */
  const translateSelectedLayers = useMutation(
    ({ root }, point: Point) => {
      if (canvasState.mode !== CanvasMode.Translating) {
        return;
      }

      const offset = {
        x: point.x - canvasState.current.x,
        y: point.y - canvasState.current.y,
      };

      const liveLayers = root.get("layers");
      for (const id of selection) {
        const layer = liveLayers.get(id);
        if (layer) {
          layer.update({
            x: layer.get("x") + offset.x,
            y: layer.get("y") + offset.y,
          });
        }
      }

      setState({ mode: CanvasMode.Translating, current: point });
    },
    [canvasState, selection]
  );

  /**
   * Resize selected layer. Only resizing a single layer is allowed.
   */
  const resizeSelectedLayer = useMutation(
    ({ root }, point: Point) => {
      if (canvasState.mode !== CanvasMode.Resizing) {
        return;
      }

      const bounds = resizeBounds(
        canvasState.initialBounds,
        canvasState.corner,
        point
      );

      const liveLayers = root.get("layers");
      const layer = liveLayers.get(selection[0]);
      if (layer) {
        layer.update(bounds);
      }
    },
    [canvasState]
  );

  const unselectLayers = useMutation(({ setMyPresence }) => {
    setMyPresence({ selection: [] }, { addToHistory: true });
  }, []);

  /**
   * Insert the first path point and start drawing with the pencil
   */
  const startDrawing = useMutation(
    ({ setMyPresence }, point: Point, pressure: number) => {
      setMyPresence({
        pencilDraft: [[point.x, point.y, pressure]],
        penColor: lastUsedColor,
      });
    },
    []
  );

  /**
   * Continue the drawing and send the current draft to other users in the room
   */
  const continueDrawing = useMutation(
    ({ setMyPresence }, point: Point, e: React.PointerEvent) => {
      if (
        canvasState.mode !== CanvasMode.Pencil ||
        e.buttons !== 1 ||
        pencilDraft == null
      ) {
        return;
      }

      setMyPresence({
        cursor: point,
        pencilDraft:
          pencilDraft.length === 1 &&
          pencilDraft[0][0] === point.x &&
          pencilDraft[0][1] === point.y
            ? pencilDraft
            : [...pencilDraft, [point.x, point.y, e.pressure]],
      });
    },
    [canvasState.mode, pencilDraft]
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
  const updateSelectionNet = useMutation(
    ({ setMyPresence }, current: Point, origin: Point) => {
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
      setMyPresence({ selection: ids });
    },
    [layerIds, layers]
  );

  const selections = useOtherIds((other) => other.presence.selection);

  /**
   * Create a map layerId to color based on the selection of all the users in the room
   */
  const layerIdsToColorSelection = useMemo(() => {
    const layerIdsToColorSelection: Record<string, string> = {};

    for (const user of selections) {
      const { connectionId, data: selection } = user;
      for (const id of selection) {
        layerIdsToColorSelection[id] = connectionIdToColor(connectionId);
      }
    }

    return layerIdsToColorSelection;
  }, [selections]);

  const pointerMove = useMutation(
    ({ setMyPresence }, e: React.PointerEvent) => {
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
      setMyPresence({ cursor: current });
    },
    [
      camera,
      canvasState,
      continueDrawing,
      resizeSelectedLayer,
      startMultiSelection,
      translateSelectedLayers,
      updateSelectionNet,
    ]
  );

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
          onPointerMove={pointerMove}
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
            {liveLayerIds.map((layerId) => {
              const layer = liveLayers.get(layerId);
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
                layers={liveLayers}
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
        canUndo={canUndo}
        canRedo={canRedo}
      />
    </>
  );
}

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
