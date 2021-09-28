import {
  useMyPresence,
  useOthers,
  useList,
  RoomProvider,
  useMap,
} from "@liveblocks/react";
import { LiveList, LiveMap, LiveObject } from "@liveblocks/client";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import IconButton from "./IconButton";
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
} from "./types";
import styles from "./index.module.css";
import getStroke from "perfect-freehand";
import {
  colorToCss,
  findIntersectingLayersWithRectangle,
  getLayers,
  getSvgPathFromStroke,
  penPointsToPathLayer,
  pointerEventToCanvasPoint,
  resizeBounds,
} from "./utils";
import SelectionBox from "./SelectionBox";
import { nanoid } from "nanoid";
import LayerComponent from "./LayerComponent";
import SelectionTools from "./SelectionTools";
import LoadingIndicator from "../../components/LoadingIndicator";
import { useSelectionBounds } from "./hooks";

const MAX_LAYERS = 100;

export default function Room() {
  return (
    <RoomProvider
      id={"multiplayer-canvas"}
      defaultPresence={() => ({
        selection: [],
        penPoints: null,
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
    return <LoadingIndicator />;
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
  const [{ selection, penPoints }, setPresence] = useMyPresence<Presence>();
  const [canvasState, setState] = useState<CanvasState>({
    mode: CanvasMode.None,
  });
  const [camera, setCamera] = useState<Camera>({ x: 0, y: 0 });
  const [lastUsedColor, setLastUsedColor] = useState<Color>({
    r: 252,
    g: 142,
    b: 42,
  });

  const selectionBounds = useSelectionBounds(layers, selection);

  useEffect(() => {
    // Disable scroll bounce on window to make the panning work properly
    document.body.classList.add(styles.no_scroll);
    return () => {
      document.body.classList.remove(styles.no_scroll);
    };
  }, []);

  const deleteItems = useCallback(() => {
    for (const id of selection) {
      const index = layerIds.indexOf(id);
      layers.delete(id);
      if (index !== -1) {
        layerIds.delete(index);
      }
    }
  }, [layerIds, layers, selection]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      switch (e.key) {
        case "Backspace": {
          deleteItems();
          break;
        }
      }
    }
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [selection, deleteItems]);

  const setFill = useCallback(
    (fill: Color) => {
      setLastUsedColor(fill);
      const selectedLayers = getLayers(layers, selection);
      for (const layer of selectedLayers) {
        layer.set("fill", fill);
      }
    },
    [layers, selection, setLastUsedColor]
  );

  const onLayerPointerDown = useCallback(
    (e: React.PointerEvent, layerId: string) => {
      e.stopPropagation();
      const point = pointerEventToCanvasPoint(e, camera);
      if (!selection.includes(layerId)) {
        setPresence({ selection: [layerId] });
      }
      setState({ mode: CanvasMode.Translating, current: point });
    },
    [setPresence, setState, selection, camera]
  );

  const moveToFront = useCallback(() => {
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
  }, [layerIds, selection]);

  const moveToBack = useCallback(() => {
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
  }, [layerIds, selection]);

  const onResizeHandlePointerDown = useCallback(
    (corner: Side, initialBounds: XYWH) => {
      setState({
        mode: CanvasMode.Resizing,
        initialBounds,
        corner,
      });
    },
    []
  );

  // TODO: Expose a hook to observe only one key of the others presence to improve performance
  // For example, multiplayer selection should not be re-render if only a cursor move
  const others = useOthers<Presence>();

  const layerIdsToColorSelection = useMemo(() => {
    const layerIdsToColorSelection: Record<string, string> = {};
    for (const user of others.toArray()) {
      const selection = user.presence?.selection;
      if (selection == null || selection.length === 0) {
        continue;
      }

      for (const id of selection) {
        layerIdsToColorSelection[id] =
          COLORS[user.connectionId % COLORS.length];
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
            deleteItems={deleteItems}
          />
        )}
        <svg
          className={styles.renderer_svg}
          onWheel={(e) => {
            setCamera((camera) => ({
              x: camera.x - e.deltaX,
              y: camera.y - e.deltaY,
            }));
          }}
          onPointerDown={(e) => {
            const point = pointerEventToCanvasPoint(e, camera);
            if (
              canvasState.mode === CanvasMode.Drawing &&
              layers.size < MAX_LAYERS
            ) {
              if (layers.size >= MAX_LAYERS) {
                setPresence({ selection: [] });
                setState({ mode: CanvasMode.None });
                return;
              }
              const layerId = nanoid();
              const layer = new LiveObject({
                type: canvasState.layerType,
                x: point.x,
                y: point.y,
                height: 100,
                width: 100,
                fill: lastUsedColor,
              });
              layerIds.push(layerId);
              layers.set(layerId, layer);
              setPresence({ selection: [layerId] });
              setState({ mode: CanvasMode.None });
              return;
            } else if (canvasState.mode === CanvasMode.Pencil) {
              setPresence({
                penPoints: [[point.x, point.y, e.pressure]],
                penColor: lastUsedColor,
              });
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
              if (
                Math.abs(current.x - canvasState.origin.x) +
                  Math.abs(current.y - canvasState.origin.y) >
                5
              ) {
                setState({
                  mode: CanvasMode.SelectionNet,
                  origin: canvasState.origin,
                  current,
                });
              }
              setPresence({ cursor: current });
            } else if (canvasState.mode === CanvasMode.SelectionNet) {
              setState({
                mode: CanvasMode.SelectionNet,
                origin: canvasState.origin,
                current,
              });
              const ids = findIntersectingLayersWithRectangle(
                layerIds,
                layers,
                canvasState.origin,
                current
              );
              setPresence({ selection: ids, cursor: current });
            } else if (canvasState.mode === CanvasMode.Translating) {
              const offset = {
                x: current.x - canvasState.current.x,
                y: current.y - canvasState.current.y,
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

              setState({ mode: CanvasMode.Translating, current });
              setPresence({ cursor: current });
            } else if (canvasState.mode === CanvasMode.Resizing) {
              const bounds = resizeBounds(
                canvasState.initialBounds,
                canvasState.corner,
                current
              );
              const layer = layers.get(selection[0]);
              if (layer) {
                layer.update(bounds);
              }
            } else if (
              canvasState.mode === CanvasMode.Pencil &&
              e.buttons === 1 &&
              penPoints != null
            ) {
              setPresence({
                cursor: current,
                penPoints:
                  penPoints.length === 1 &&
                  penPoints[0][0] === current.x &&
                  penPoints[0][1] === current.y
                    ? penPoints
                    : [...penPoints, [current.x, current.y, e.pressure]],
              });
            } else {
              setPresence({ cursor: current });
            }
          }}
          onPointerUp={() => {
            if (
              canvasState.mode === CanvasMode.None ||
              canvasState.mode === CanvasMode.Pressing
            ) {
              setPresence({ selection: [] });
            }
            if (canvasState.mode === CanvasMode.Pencil && penPoints != null) {
              if (penPoints.length > 2 && layers.size < MAX_LAYERS) {
                const id = nanoid();
                layers.set(
                  id,
                  new LiveObject(penPointsToPathLayer(penPoints, lastUsedColor))
                );
                layerIds.push(id);
                setPresence({ penPoints: null });
                setState({ mode: CanvasMode.Pencil });
                return;
              } else {
                setPresence({ penPoints: null });
              }
            }
            setState({
              mode: CanvasMode.None,
            });
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
            {penPoints != null && penPoints.length > 0 && (
              <path
                fill={colorToCss(lastUsedColor)}
                d={getSvgPathFromStroke(
                  getStroke(penPoints, {
                    size: 16,
                    thinning: 0.5,
                    smoothing: 0.5,
                    streamline: 0.5,
                  })
                )}
              />
            )}
          </g>
        </svg>
      </div>
      <div className={styles.tools_panel_container}>
        <div className={styles.tools_panel}>
          <IconButton
            isActive={
              canvasState.mode === CanvasMode.None ||
              canvasState.mode === CanvasMode.Translating ||
              canvasState.mode === CanvasMode.SelectionNet ||
              canvasState.mode === CanvasMode.Pressing ||
              canvasState.mode === CanvasMode.Resizing
            }
            onClick={() =>
              setState({
                mode: CanvasMode.None,
              })
            }
          >
            <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
              <path
                d="M13 26V9L25 21.1428H18.2189L13 26Z"
                fill="currentColor"
              />
            </svg>
          </IconButton>
          <IconButton
            isActive={canvasState.mode === CanvasMode.Pencil}
            onClick={() =>
              setState({
                mode: CanvasMode.Pencil,
              })
            }
          >
            <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
              <path
                d="M22.8538 10.1464C22.76 10.0527 22.6329 10 22.5003 10C22.3677 10 22.2406 10.0527 22.1468 10.1464L20.4998 11.7934L24.2068 15.5004L25.8538 13.8544C25.9004 13.8079 25.9373 13.7528 25.9625 13.692C25.9877 13.6313 26.0007 13.5662 26.0007 13.5004C26.0007 13.4346 25.9877 13.3695 25.9625 13.3088C25.9373 13.248 25.9004 13.1928 25.8538 13.1464L22.8538 10.1464ZM23.4998 16.2074L19.7928 12.5004L13.2928 19.0004H13.4998C13.6324 19.0004 13.7596 19.0531 13.8534 19.1468C13.9471 19.2406 13.9998 19.3678 13.9998 19.5004V20.0004H14.4998C14.6324 20.0004 14.7596 20.0531 14.8534 20.1468C14.9471 20.2406 14.9998 20.3678 14.9998 20.5004V21.0004H15.4998C15.6324 21.0004 15.7596 21.0531 15.8534 21.1468C15.9471 21.2406 15.9998 21.3678 15.9998 21.5004V22.0004H16.4998C16.6324 22.0004 16.7596 22.0531 16.8534 22.1468C16.9471 22.2406 16.9998 22.3678 16.9998 22.5004V22.7074L23.4998 16.2074ZM16.0318 23.6754C16.0108 23.6194 15.9999 23.5602 15.9998 23.5004V23.0004H15.4998C15.3672 23.0004 15.24 22.9477 15.1463 22.8539C15.0525 22.7602 14.9998 22.633 14.9998 22.5004V22.0004H14.4998C14.3672 22.0004 14.24 21.9477 14.1463 21.8539C14.0525 21.7602 13.9998 21.633 13.9998 21.5004V21.0004H13.4998C13.3672 21.0004 13.24 20.9477 13.1463 20.8539C13.0525 20.7602 12.9998 20.633 12.9998 20.5004V20.0004H12.4998C12.44 20.0003 12.3808 19.9895 12.3248 19.9684L12.1458 20.1464C12.0982 20.1944 12.0607 20.2515 12.0358 20.3144L10.0358 25.3144C9.99944 25.4053 9.99053 25.5048 10.0102 25.6007C10.0299 25.6966 10.0772 25.7845 10.1464 25.8538C10.2157 25.923 10.3036 25.9703 10.3995 25.99C10.4954 26.0097 10.5949 26.0008 10.6858 25.9644L15.6858 23.9644C15.7487 23.9395 15.8058 23.902 15.8538 23.8544L16.0318 23.6764V23.6754Z"
                fill="currentColor"
              />
            </svg>
          </IconButton>
          <IconButton
            isActive={
              canvasState.mode === CanvasMode.Drawing &&
              canvasState.layerType === LayerType.Rectangle
            }
            onClick={() =>
              setState({
                mode: CanvasMode.Drawing,
                layerType: LayerType.Rectangle,
              })
            }
          >
            <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M24 12H12V24H24V12ZM10 10V26H26V10H10Z"
                fill="currentColor"
              />
            </svg>
          </IconButton>
          <IconButton
            isActive={
              canvasState.mode === CanvasMode.Drawing &&
              canvasState.layerType === LayerType.Ellipse
            }
            onClick={() =>
              setState({
                mode: CanvasMode.Drawing,
                layerType: LayerType.Ellipse,
              })
            }
          >
            <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M11 18C11 21.866 14.134 25 18 25C21.866 25 25 21.866 25 18C25 14.134 21.866 11 18 11C14.134 11 11 14.134 11 18ZM18 9C13.0294 9 9 13.0294 9 18C9 22.9706 13.0294 27 18 27C22.9706 27 27 22.9706 27 18C27 13.0294 22.9706 9 18 9Z"
                fill="currentColor"
              />
            </svg>
          </IconButton>
        </div>
      </div>
    </>
  );
}

const COLORS = ["#DC2626", "#D97706", "#059669", "#7C3AED", "#DB2777"];

const MultiplayerGuides = React.memo(() => {
  const others = useOthers<Presence>();
  return (
    <>
      {others.map((user) => {
        if (user.presence?.cursor) {
          return (
            <path
              key={`cursor-${user.connectionId}`}
              style={{
                transition: "transform 0.5s cubic-bezier(.17,.93,.38,1)",
                transform: `translateX(${user.presence.cursor.x}px) translateY(${user.presence.cursor.y}px)`,
              }}
              d="M5.65376 12.3673H5.46026L5.31717 12.4976L0.500002 16.8829L0.500002 1.19841L11.7841 12.3673H5.65376Z"
              fill={COLORS[user.connectionId % COLORS.length]}
            />
          );
        }
        return null;
      })}
      {others.map((user) => {
        if (user.presence?.penPoints) {
          return (
            <path
              key={`pencil-${user.connectionId}`}
              d={getSvgPathFromStroke(
                getStroke(user.presence.penPoints, {
                  size: 16,
                  thinning: 0.5,
                  smoothing: 0.5,
                  streamline: 0.5,
                })
              )}
              fill={
                user.presence.penColor
                  ? colorToCss(user.presence.penColor)
                  : undefined
              }
            />
          );
        }
        return null;
      })}
    </>
  );
});
