"use client";

import { shallow } from "@liveblocks/client";
import {
  useHistory,
  useOthersMapped,
  useUpdateMyPresence,
} from "@liveblocks/react/suspense";
import { bindDrag, dragThreshold, type Viewport } from "@ui-sdk/core";
import { usePart, usePrimitive } from "@ui-sdk/react/primitive";
import { MaximizeIcon, MinusIcon, PlusIcon } from "lucide-react";
import {
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent,
  type ReactNode,
  type Ref,
} from "react";
import { useEvent } from "@/hooks/use-event";
import type { PlanActions } from "@/hooks/use-plan-actions";
import { getCatalogItem, type FurnitureType } from "@/lib/catalog";
import {
  add,
  boundsOf,
  clamp,
  distance,
  dot,
  findWall,
  fitOpening,
  furnitureExtents,
  nearestWall,
  normalizeAngle,
  planBounds,
  pointInPolygon,
  rotate,
  round,
  scale,
  sub,
  WALL_THICKNESS,
  wallsOf,
  type Wall,
  type WallHit,
} from "@/lib/geometry";
import {
  isSameSelection,
  type Corner,
  type Furniture,
  type Opening,
  type Point,
  type Room,
  type Selection,
  type Tool,
} from "@/lib/plan";
import {
  alignmentTargets,
  GRID,
  NO_GUIDES,
  snapDelta,
  snapFurnitureToWalls,
  snapPoint,
  snapTo,
  type Guides,
} from "@/lib/snapping";
import { formatLength, scaleBarLength, type Unit } from "@/lib/units";
import { Button } from "../ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipShortcut,
  TooltipTrigger,
} from "../ui/tooltip";
import { Cursors } from "./cursors";
import { Dimension } from "./dimension";
import { floorPlan } from "./floor-plan";
import { FurnitureHandles, FurnitureShape } from "./furniture-shape";
import { OpeningShape } from "./opening-shape";
import {
  RoomDimensions,
  RoomFloor,
  RoomHandles,
  RoomLabel,
  RoomWalls,
} from "./room-shape";
import { isTyping, usePlanShortcuts } from "./use-plan-shortcuts";

const MIN_FURNITURE_SIZE = 20;
const MIN_ROOM_SIZE = 60;
const DEFAULT_ROOM = { width: 400, depth: 320 };
const DEFAULT_OPENING_WIDTH = { door: 80, window: 120 };

// What a pointer drag is changing, from pointer down to pointer up.
type DragAction =
  | { kind: "furniture"; id: string; start: Point; origin: Point }
  | { kind: "rotate"; id: string }
  | { kind: "resize"; item: Furniture; x: -1 | 1; y: -1 | 1 }
  | {
      kind: "room";
      id: string;
      start: Point;
      points: readonly Corner[];
      furniture: { id: string; x: number; y: number }[];
    }
  | { kind: "corner"; roomId: string; cornerId: string }
  | {
      kind: "wall";
      roomId: string;
      wallId: string;
      start: Point;
      points: readonly Corner[];
    }
  | { kind: "opening"; id: string }
  | { kind: "draw"; start: Point; end: Point };

type Drag = DragAction & {
  // False until the pointer has moved a few pixels, so a click never nudges.
  started: boolean;
  // What the drag last wrote to Storage: the same values aren't written
  // twice, and a drag that wrote nothing has nothing to take back.
  written: string | null;
  changed: boolean;
};

// A press that pans the view. If the view hasn't moved by the time the
// click arrives, it was a click, and selects `selection`.
type Press = { view: Viewport; selection: Selection | null };

// Where a new door or window would land on a wall.
type Placement = { wall: Wall; offset: number; width: number };

export type CanvasHandle = {
  // Adds a piece dragged out of the library where it was dropped. Returns
  // false when that's outside the canvas.
  dropFurniture: (
    type: FurnitureType,
    clientX: number,
    clientY: number
  ) => boolean;
  // Adds a piece in the middle of the view.
  addFurniture: (type: FurnitureType) => void;
  getZoom: () => number;
};

type CanvasProps = {
  ref?: Ref<CanvasHandle>;
  rooms: ReadonlyMap<string, Room>;
  openings: ReadonlyMap<string, Opening>;
  furniture: ReadonlyMap<string, Furniture>;
  actions: PlanActions;
  tool: Tool;
  onToolChange: (tool: Tool) => void;
  selection: Selection | null;
  onSelect: (selection: Selection | null) => void;
  unit: Unit;
  showDimensions: boolean;
  children?: ReactNode;
};

function placeOnWall(hit: WallHit, width: number, grid: number) {
  const margin = width / 2 + 4;
  return clamp(
    snapTo(hit.along, grid),
    margin,
    Math.max(margin, hit.wall.length - margin)
  );
}

/**
 * The floor plan: an SVG drawn in plan coordinates (centimeters) under a
 * single pan and zoom transform. Everything on it is read from Liveblocks
 * Storage and changed through `actions`, so every drag is synced live.
 *
 * The gestures come from ui-sdk. The `floorPlan` primitive pans and zooms
 * the view (wheel, trackpad, touch), `bindDrag` follows the pointer for
 * everything that's dragged on the plan, and `useShortcut` binds the keys.
 *
 * Each drag pauses the undo history on pointer down and resumes it on
 * pointer up, which turns the many small updates of a drag into one step.
 */
export function Canvas({
  ref,
  rooms,
  openings,
  furniture,
  actions,
  tool,
  onToolChange,
  selection,
  onSelect,
  unit,
  showDimensions,
  children,
}: CanvasProps) {
  const history = useHistory();
  const updateMyPresence = useUpdateMyPresence();

  const surfaceRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<Drag | null>(null);
  // Stops following the pointer, for a drag cut short.
  const stopDragRef = useRef<(() => void) | null>(null);
  const pressRef = useRef<Press | null>(null);
  // The pointers panning or pinching the view.
  const panPointers = useRef(new Set<number>());
  const spaceRef = useRef(false);
  const lastCornerPress = useRef<{ id: string; time: number } | null>(null);
  const addedCount = useRef(0);

  const [view, setView] = useState<Viewport>({ x: 0, y: 0, zoom: 0.8 });
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [ready, setReady] = useState(false);
  const [panning, setPanning] = useState(false);
  const [spaceHeld, setSpaceHeld] = useState(false);
  const [guides, setGuides] = useState<Guides>(NO_GUIDES);
  const [draft, setDraft] = useState<{ a: Point; b: Point } | null>(null);
  const [placement, setPlacement] = useState<Placement | null>(null);

  const roomList = useMemo(
    () => [...rooms.values()].sort((a, b) => a.id.localeCompare(b.id)),
    [rooms]
  );
  const walls = useMemo(() => roomList.flatMap(wallsOf), [roomList]);
  const furnitureList = useMemo(
    () =>
      [...furniture.values()].sort(
        (a, b) =>
          Number(!getCatalogItem(a.type)?.onFloor) -
            Number(!getCatalogItem(b.type)?.onFloor) ||
          a.z - b.z ||
          a.id.localeCompare(b.id)
      ),
    [furniture]
  );

  // What everyone else has selected, from Presence.
  const peers = useOthersMapped(
    (other) => ({
      selection: other.presence.selection,
      name: other.info.name,
      color: other.info.color,
    }),
    shallow
  );

  const selectedRoom =
    selection?.kind === "room" ? rooms.get(selection.id) : undefined;
  const selectedFurniture =
    selection?.kind === "furniture" ? furniture.get(selection.id) : undefined;

  /* ------------------------------------------------------------------ */
  /* View: pan, zoom, fit                                                */
  /* ------------------------------------------------------------------ */

  // The box around everything on the plan, which "Zoom to fit" frames.
  const content = useMemo(() => {
    const bounds = planBounds(rooms.values(), furniture.values());
    return bounds
      ? {
          left: bounds.minX,
          top: bounds.minY,
          right: bounds.maxX,
          bottom: bounds.maxY,
        }
      : null;
  }, [rooms, furniture]);

  // The primitive holds the viewport and moves it. It's mirrored in `view`
  // because nearly everything drawn here depends on the zoom: handles,
  // labels and dimensions keep their size on screen whatever the scale.
  const plan = usePrimitive(floorPlan, {
    content,
    onViewportChange: (next, details) => {
      setView(next);
      if (details.reason === "drag" || details.reason === "pinch") {
        setPanning(true);
      }
    },
  });
  const { viewport } = plan.api;

  const toPlan = (clientX: number, clientY: number): Point =>
    viewport.toCanvas(clientX, clientY);

  const fit = useEvent(() => plan.api.fit());

  // Track the canvas size, and frame the plan the first time it's known.
  useLayoutEffect(() => {
    const surface = surfaceRef.current;
    if (!surface) {
      return;
    }
    let measured = false;
    const measure = () => {
      const next = {
        width: surface.clientWidth,
        height: surface.clientHeight,
      };
      setSize(next);
      if (!measured && next.width > 0) {
        measured = true;
        fit();
        setReady(true);
      }
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(surface);
    return () => observer.disconnect();
  }, [fit]);

  /* ------------------------------------------------------------------ */
  /* Adding furniture from the library                                   */
  /* ------------------------------------------------------------------ */

  const placeFurniture = useEvent((type: FurnitureType, point: Point) => {
    const entry = getCatalogItem(type);
    if (!entry) {
      return;
    }
    const { width, depth } = entry;
    const item = {
      type,
      rotation: 0,
      width,
      depth,
      x: snapTo(point.x, GRID),
      y: snapTo(point.y, GRID),
    };
    const position = snapFurnitureToWalls(
      item,
      walls,
      10 / viewport.get().zoom
    );
    const id = actions.addFurniture({
      ...item,
      x: round(position.x),
      y: round(position.y),
    });
    onSelect({ kind: "furniture", id });
    onToolChange("select");
  });

  useImperativeHandle(
    ref,
    () => ({
      dropFurniture(type, clientX, clientY) {
        const rect = surfaceRef.current?.getBoundingClientRect();
        if (
          !rect ||
          clientX < rect.left ||
          clientX > rect.right ||
          clientY < rect.top ||
          clientY > rect.bottom
        ) {
          return false;
        }
        placeFurniture(type, viewport.toCanvas(clientX, clientY));
        return true;
      },
      addFurniture(type) {
        const rect = surfaceRef.current?.getBoundingClientRect();
        if (!rect) {
          return;
        }
        // Cascade pieces added one after the other, so they don't stack up
        // exactly on top of each other.
        const cascade = (addedCount.current++ % 5) * 24;
        placeFurniture(
          type,
          viewport.toCanvas(
            rect.left + rect.width / 2 + cascade,
            rect.top + rect.height / 2 + cascade
          )
        );
      },
      getZoom: () => viewport.get().zoom,
    }),
    [placeFurniture, viewport]
  );

  /* ------------------------------------------------------------------ */
  /* Pointer: starting a pan or a drag                                   */
  /* ------------------------------------------------------------------ */

  // Hands a press to the viewport: one pointer pans, two pinch to zoom.
  // `click` is what the press selects if it turns out to be a click, or
  // `undefined` to leave the selection alone.
  function beginPan(
    event: PointerEvent<Element>,
    click: Selection | null | undefined
  ) {
    event.stopPropagation();
    panPointers.current.add(event.pointerId);
    pressRef.current =
      click === undefined || panPointers.current.size > 1
        ? null
        : { view: viewport.get(), selection: click };
    viewport.pointerdown(event.nativeEvent);
  }

  // Follows the pointer with ui-sdk's `bindDrag` until it's released. It
  // keeps going outside the canvas, leaves a press that doesn't move alone,
  // and ends the drag as canceled when Escape is pressed.
  function beginDrag(event: PointerEvent<Element>, action: DragAction) {
    event.stopPropagation();
    const surface = surfaceRef.current;
    if (!surface || dragRef.current) {
      return null;
    }
    const drag: Drag = {
      ...action,
      started: false,
      written: null,
      changed: false,
    };
    dragRef.current = drag;
    // Everything until pointer up is one undo step.
    history.pause();
    stopDragRef.current = bindDrag(surface, event.nativeEvent, {
      threshold: dragThreshold,
      cancelOnEscape: true,
      onStart: () => {
        drag.started = true;
      },
      onMove: (sample) =>
        moveDrag(drag, toPlan(sample.x, sample.y), sample.event.altKey),
      onEnd: (_event, canceled) => endDrag(drag, canceled),
    });
    return drag;
  }

  // Writes to Storage, unless the drag just wrote the very same values:
  // the pointer moves many times within one step of the grid.
  function write(drag: Drag, values: string, apply: () => void) {
    if (drag.written !== values) {
      drag.written = values;
      drag.changed = true;
      apply();
    }
  }

  // A drag that's still going when the plan goes away.
  const abandonDrag = useEvent(() => {
    if (dragRef.current) {
      stopDragRef.current?.();
      dragRef.current = null;
      history.resume();
    }
  });
  useEffect(() => abandonDrag, [abandonDrag]);

  function findPlacement(point: Point, kind: "door" | "window") {
    const hit = nearestWall(point, roomList, 36 / view.zoom);
    if (!hit) {
      return null;
    }
    const width = Math.min(DEFAULT_OPENING_WIDTH[kind], hit.wall.length - 20);
    if (width < 40) {
      return null;
    }
    return { wall: hit.wall, width, offset: placeOnWall(hit, width, GRID) };
  }

  // Runs before anything on the plan sees the press.
  function handlePointerDownCapture(event: PointerEvent<HTMLDivElement>) {
    pressRef.current = null;
    if (dragRef.current) {
      // One thing is dragged at a time: a second finger doesn't grab another.
      event.stopPropagation();
    } else if (panPointers.current.size > 0) {
      // A second finger on the plan while one is panning: pinch to zoom,
      // whatever it lands on.
      beginPan(event, undefined);
    } else if (event.button === 1 || (event.button === 0 && spaceRef.current)) {
      // Hold Space, or use the middle mouse button, to pan from anywhere,
      // even over furniture.
      event.preventDefault();
      beginPan(event, undefined);
    }
  }

  // A press that nothing on the plan handled: the empty canvas, or anywhere
  // at all while a drawing tool is active.
  function handlePointerDown(event: PointerEvent<HTMLDivElement>) {
    if (event.button !== 0) {
      return;
    }
    const point = toPlan(event.clientX, event.clientY);

    if (tool === "room") {
      const targets = alignmentTargets(roomList, () => false);
      const start = snapPoint(point, targets, 8 / view.zoom, GRID).point;
      beginDrag(event, { kind: "draw", start, end: start });
      return;
    }

    if (tool === "door" || tool === "window") {
      const spot = findPlacement(point, tool);
      if (spot) {
        const id = actions.addOpening({
          kind: tool,
          style: "single",
          roomId: spot.wall.roomId,
          wallId: spot.wall.id,
          offset: spot.offset,
          width: spot.width,
          hinge: "start",
          swing: "in",
        });
        onSelect({ kind: "opening", id });
        onToolChange("select");
        setPlacement(null);
      }
      return;
    }

    beginPan(event, null);
  }

  const handleFurniturePointerDown = useEvent(
    (event: PointerEvent<SVGGElement>, item: Furniture) => {
      if (event.button !== 0) {
        return;
      }
      onSelect({ kind: "furniture", id: item.id });
      beginDrag(event, {
        kind: "furniture",
        id: item.id,
        start: toPlan(event.clientX, event.clientY),
        origin: { x: item.x, y: item.y },
      });
    }
  );

  function handleRotatePointerDown(
    event: PointerEvent<SVGCircleElement>,
    item: Furniture
  ) {
    if (event.button === 0) {
      beginDrag(event, { kind: "rotate", id: item.id });
    }
  }

  function handleResizePointerDown(
    event: PointerEvent<SVGRectElement>,
    item: Furniture,
    x: -1 | 1,
    y: -1 | 1
  ) {
    if (event.button === 0) {
      beginDrag(event, { kind: "resize", item, x, y });
    }
  }

  // Dragging a room's floor moves the room, but only once it's selected:
  // floors cover most of the plan, and the first drag should pan the view
  // rather than tear a room away.
  function handleRoomPointerDown(event: PointerEvent<SVGGElement>, room: Room) {
    if (event.button !== 0) {
      return;
    }
    const target: Selection = { kind: "room", id: room.id };
    if (!isSameSelection(selection, target)) {
      beginPan(event, target);
      return;
    }
    beginDrag(event, {
      kind: "room",
      id: room.id,
      start: toPlan(event.clientX, event.clientY),
      points: room.points,
      // The furniture standing in the room comes along.
      furniture: furnitureList
        .filter((item) => pointInPolygon(item, room.points))
        .map(({ id, x, y }) => ({ id, x, y })),
    });
  }

  function handleWallPointerDown(
    event: PointerEvent<SVGLineElement>,
    room: Room,
    wall: Wall
  ) {
    if (event.button !== 0) {
      return;
    }
    onSelect({ kind: "room", id: room.id });
    beginDrag(event, {
      kind: "wall",
      roomId: room.id,
      wallId: wall.id,
      start: toPlan(event.clientX, event.clientY),
      points: room.points,
    });
  }

  function handleCornerPointerDown(
    event: PointerEvent<SVGCircleElement>,
    room: Room,
    corner: Corner
  ) {
    if (event.button !== 0) {
      return;
    }
    // A double press removes the corner. Detected by hand: the pointer is
    // captured while dragging, so `dblclick` wouldn't reach the handle.
    const last = lastCornerPress.current;
    if (last?.id === corner.id && event.timeStamp - last.time < 350) {
      event.stopPropagation();
      lastCornerPress.current = null;
      actions.removeCorner(room.id, corner.id);
      return;
    }
    lastCornerPress.current = { id: corner.id, time: event.timeStamp };
    beginDrag(event, { kind: "corner", roomId: room.id, cornerId: corner.id });
  }

  // Pressing a "+" adds a corner in the middle of the wall and starts
  // dragging it right away, as a single undo step.
  function handleMidpointPointerDown(
    event: PointerEvent<SVGGElement>,
    room: Room,
    wall: Wall
  ) {
    if (event.button !== 0) {
      return;
    }
    const drag = beginDrag(event, {
      kind: "corner",
      roomId: room.id,
      cornerId: "",
    });
    if (!drag) {
      return;
    }
    const cornerId = actions.insertCorner(room.id, wall.id, {
      x: round((wall.a.x + wall.b.x) / 2),
      y: round((wall.a.y + wall.b.y) / 2),
    });
    if (cornerId && drag.kind === "corner") {
      drag.cornerId = cornerId;
      drag.changed = true;
    }
  }

  function handleOpeningPointerDown(
    event: PointerEvent<SVGGElement>,
    opening: Opening
  ) {
    if (event.button !== 0) {
      return;
    }
    onSelect({ kind: "opening", id: opening.id });
    beginDrag(event, { kind: "opening", id: opening.id });
  }

  /* ------------------------------------------------------------------ */
  /* Pointer: dragging                                                   */
  /* ------------------------------------------------------------------ */

  function showCursor(point: Point | null) {
    updateMyPresence({
      cursor: point ? { x: Math.round(point.x), y: Math.round(point.y) } : null,
    });
  }

  // `fine` is Alt held down: place things freely, down to the centimeter.
  const moveDrag = useEvent((drag: Drag, point: Point, fine: boolean) => {
    if (dragRef.current !== drag) {
      return;
    }
    showCursor(point);

    const { zoom } = viewport.get();
    const grid = fine ? 1 : GRID;
    const reach = fine ? 0 : 8 / zoom;

    switch (drag.kind) {
      case "furniture": {
        const item = furniture.get(drag.id);
        if (!item) {
          break;
        }
        let position = {
          x: snapTo(drag.origin.x + point.x - drag.start.x, grid),
          y: snapTo(drag.origin.y + point.y - drag.start.y, grid),
        };
        if (!fine) {
          position = snapFurnitureToWalls(
            { ...item, ...position },
            walls,
            10 / zoom
          );
        }
        const x = round(position.x);
        const y = round(position.y);
        if (drag.written === null && x === item.x && y === item.y) {
          break;
        }
        write(drag, `${x},${y}`, () =>
          actions.updateFurniture(drag.id, { x, y })
        );
        break;
      }

      case "rotate": {
        const item = furniture.get(drag.id);
        if (!item) {
          break;
        }
        // The handle sticks out of the back of the piece, which faces up at
        // 0°: hence the quarter turn.
        const angle =
          (Math.atan2(point.y - item.y, point.x - item.x) * 180) / Math.PI + 90;
        const rotation = normalizeAngle(snapTo(angle, fine ? 1 : 15));
        if (drag.written === null && rotation === item.rotation) {
          break;
        }
        write(drag, `${rotation}`, () =>
          actions.updateFurniture(drag.id, { rotation })
        );
        break;
      }

      case "resize": {
        // The corner opposite the dragged one stays where it is.
        const { item } = drag;
        const anchor = add(
          item,
          rotate(
            {
              x: (-drag.x * item.width) / 2,
              y: (-drag.y * item.depth) / 2,
            },
            item.rotation
          )
        );
        const local = rotate(sub(point, anchor), -item.rotation);
        const width = Math.max(
          MIN_FURNITURE_SIZE,
          snapTo(drag.x * local.x, grid)
        );
        const depth = Math.max(
          MIN_FURNITURE_SIZE,
          snapTo(drag.y * local.y, grid)
        );
        if (
          drag.written === null &&
          width === item.width &&
          depth === item.depth
        ) {
          break;
        }
        const center = add(
          anchor,
          rotate(
            { x: (drag.x * width) / 2, y: (drag.y * depth) / 2 },
            item.rotation
          )
        );
        write(drag, `${width},${depth}`, () =>
          actions.updateFurniture(item.id, {
            width,
            depth,
            x: round(center.x),
            y: round(center.y),
          })
        );
        break;
      }

      case "room": {
        const targets = alignmentTargets(
          roomList,
          (roomId) => roomId === drag.id
        );
        const { delta, guides } = snapDelta(
          drag.points,
          sub(point, drag.start),
          targets,
          reach,
          grid
        );
        setGuides(guides);
        if (drag.written === null && delta.x === 0 && delta.y === 0) {
          break;
        }
        write(drag, `${delta.x},${delta.y}`, () =>
          actions.moveRoom(
            drag.id,
            drag.points.map((corner) => ({
              ...corner,
              x: round(corner.x + delta.x),
              y: round(corner.y + delta.y),
            })),
            drag.furniture.map((item) => ({
              id: item.id,
              x: round(item.x + delta.x),
              y: round(item.y + delta.y),
            }))
          )
        );
        break;
      }

      case "corner": {
        const room = rooms.get(drag.roomId);
        if (!room) {
          break;
        }
        const targets = alignmentTargets(
          roomList,
          (roomId, cornerId) =>
            roomId === drag.roomId && cornerId === drag.cornerId
        );
        const snapped = snapPoint(point, targets, reach, grid);
        setGuides(snapped.guides);
        const current = room.points.find(
          (corner) => corner.id === drag.cornerId
        );
        if (
          drag.written === null &&
          current?.x === snapped.point.x &&
          current.y === snapped.point.y
        ) {
          break;
        }
        write(drag, `${snapped.point.x},${snapped.point.y}`, () =>
          actions.setRoomPoints(
            room.id,
            room.points.map((corner) =>
              corner.id === drag.cornerId
                ? { ...corner, ...snapped.point }
                : corner
            )
          )
        );
        break;
      }

      case "wall": {
        // A wall slides sideways, taking its two corners with it.
        const index = drag.points.findIndex(
          (corner) => corner.id === drag.wallId
        );
        if (index === -1) {
          break;
        }
        const nextIndex = (index + 1) % drag.points.length;
        const a = drag.points[index];
        const b = drag.points[nextIndex];
        const length = distance(a, b);
        if (length === 0) {
          break;
        }
        const dir = scale(sub(b, a), 1 / length);
        const normal = { x: -dir.y, y: dir.x };
        const travel = dot(sub(point, drag.start), normal);
        const targets = alignmentTargets(
          roomList,
          (roomId, cornerId) =>
            roomId === drag.roomId && (cornerId === a.id || cornerId === b.id)
        );

        let shift: Point;
        let nextGuides = NO_GUIDES;
        if (Math.abs(dir.y) < 0.001) {
          // A horizontal wall moves up and down, and can line up with
          // corners of other rooms.
          const snapped = snapPoint(
            { x: a.x, y: a.y + travel * normal.y },
            targets,
            reach,
            grid
          );
          shift = { x: 0, y: snapped.point.y - a.y };
          nextGuides = { x: null, y: snapped.guides.y };
        } else if (Math.abs(dir.x) < 0.001) {
          const snapped = snapPoint(
            { x: a.x + travel * normal.x, y: a.y },
            targets,
            reach,
            grid
          );
          shift = { x: snapped.point.x - a.x, y: 0 };
          nextGuides = { x: snapped.guides.x, y: null };
        } else {
          shift = scale(normal, snapTo(travel, grid));
        }
        shift = { x: round(shift.x), y: round(shift.y) };
        setGuides(nextGuides);
        if (drag.written === null && shift.x === 0 && shift.y === 0) {
          break;
        }
        write(drag, `${shift.x},${shift.y}`, () =>
          actions.setRoomPoints(
            drag.roomId,
            drag.points.map((corner, cornerIndex) =>
              cornerIndex === index || cornerIndex === nextIndex
                ? {
                    ...corner,
                    x: round(corner.x + shift.x),
                    y: round(corner.y + shift.y),
                  }
                : corner
            )
          )
        );
        break;
      }

      case "opening": {
        // Doors and windows slide along walls, and hop to whichever wall is
        // closest to the pointer, in any room.
        const opening = openings.get(drag.id);
        const hit = nearestWall(point, roomList, 60 / zoom);
        if (!opening || !hit) {
          break;
        }
        const next = {
          roomId: hit.wall.roomId,
          wallId: hit.wall.id,
          offset: placeOnWall(hit, opening.width, grid),
        };
        if (
          drag.written === null &&
          next.roomId === opening.roomId &&
          next.wallId === opening.wallId &&
          next.offset === opening.offset
        ) {
          break;
        }
        write(drag, `${next.roomId},${next.wallId},${next.offset}`, () =>
          actions.updateOpening(drag.id, next)
        );
        break;
      }

      case "draw": {
        const targets = alignmentTargets(roomList, () => false);
        const snapped = snapPoint(point, targets, reach, grid);
        drag.end = snapped.point;
        setDraft({ a: drag.start, b: snapped.point });
        setGuides(snapped.guides);
        break;
      }
    }
  });

  const endDrag = useEvent((drag: Drag, canceled: boolean) => {
    if (dragRef.current !== drag) {
      return;
    }
    dragRef.current = null;
    stopDragRef.current = null;
    setGuides(NO_GUIDES);

    if (drag.kind === "draw") {
      setDraft(null);
      let outline: Point[] | null = null;
      if (canceled) {
        // Escape: no room after all.
      } else if (drag.started) {
        const left = Math.min(drag.start.x, drag.end.x);
        const right = Math.max(drag.start.x, drag.end.x);
        const top = Math.min(drag.start.y, drag.end.y);
        const bottom = Math.max(drag.start.y, drag.end.y);
        if (right - left >= MIN_ROOM_SIZE && bottom - top >= MIN_ROOM_SIZE) {
          outline = [
            { x: left, y: top },
            { x: right, y: top },
            { x: right, y: bottom },
            { x: left, y: bottom },
          ];
        }
      } else {
        // A plain click drops a room of a standard size, centered on it.
        const left = snapTo(drag.start.x - DEFAULT_ROOM.width / 2, GRID);
        const top = snapTo(drag.start.y - DEFAULT_ROOM.depth / 2, GRID);
        outline = [
          { x: left, y: top },
          { x: left + DEFAULT_ROOM.width, y: top },
          { x: left + DEFAULT_ROOM.width, y: top + DEFAULT_ROOM.depth },
          { x: left, y: top + DEFAULT_ROOM.depth },
        ];
      }
      if (outline) {
        const id = actions.addRoom(outline);
        onSelect({ kind: "room", id });
        onToolChange("select");
      }
    }

    history.resume();
    if (canceled && drag.changed) {
      // Escape puts everything back where it was: the drag is one step of
      // the history by now, which is taken back for everyone.
      history.undo();
    }
  });

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    if (dragRef.current) {
      // The drag reports where the pointer is, once per frame.
      return;
    }
    const point = toPlan(event.clientX, event.clientY);
    showCursor(point);
    if (
      (tool === "door" || tool === "window") &&
      panPointers.current.size === 0
    ) {
      setPlacement(findPlacement(point, tool));
    }
  }

  function handlePointerEnd(event: PointerEvent<HTMLDivElement>) {
    if (panPointers.current.delete(event.pointerId)) {
      setPanning(false);
    }
  }

  function handlePointerLeave() {
    showCursor(null);
    setPlacement(null);
  }

  // The click that follows a press on the empty canvas or on a room. The
  // viewport pans as soon as the pointer moves, so a view that's still
  // where it was means nothing was dragged.
  function handleClick() {
    const press = pressRef.current;
    pressRef.current = null;
    if (!press) {
      return;
    }
    const now = viewport.get();
    if (
      now.x === press.view.x &&
      now.y === press.view.y &&
      now.zoom === press.view.zoom
    ) {
      onSelect(press.selection);
    }
  }

  /* ------------------------------------------------------------------ */
  /* Keyboard                                                            */
  /* ------------------------------------------------------------------ */

  usePlanShortcuts({
    rooms,
    openings,
    furniture,
    actions,
    tool,
    onToolChange,
    selection,
    onSelect,
    onFit: fit,
    idle: () => dragRef.current === null,
  });

  // Two things that aren't shortcuts: Space is held down rather than
  // pressed, and the zoom keys (+, − and 0) belong to the viewport, which
  // knows them on every keyboard layout and tells screen readers the zoom.
  useEffect(() => {
    const release = () => {
      spaceRef.current = false;
      setSpaceHeld(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (
        isTyping(event.target) ||
        event.metaKey ||
        event.ctrlKey ||
        event.altKey
      ) {
        return;
      }
      if (event.key === " ") {
        // Leave Space alone when it would press a focused button.
        const onControl =
          event.target instanceof HTMLElement &&
          event.target.closest("button, a, [role='menuitem']");
        if (!onControl) {
          event.preventDefault();
          spaceRef.current = true;
          setSpaceHeld(true);
        }
        return;
      }
      viewport.keydown(event);
    };
    const handleKeyUp = (event: KeyboardEvent) => {
      if (event.key === " ") {
        release();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    window.addEventListener("blur", release);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("blur", release);
    };
  }, [viewport]);

  // The door or window preview only makes sense while its tool is active.
  useEffect(() => {
    if (tool !== "door" && tool !== "window") {
      setPlacement(null);
    }
  }, [tool]);

  /* ------------------------------------------------------------------ */
  /* Rendering                                                           */
  /* ------------------------------------------------------------------ */

  const { zoom } = view;

  // The part of the plan currently in view, for guides that span it.
  const visible = {
    left: -view.x / zoom,
    top: -view.y / zoom,
    right: (size.width - view.x) / zoom,
    bottom: (size.height - view.y) / zoom,
  };

  // A meter grid (five meters when zoomed far out), split in five when
  // there's room for the finer lines.
  const major = (100 * zoom >= 36 ? 100 : 500) * zoom;
  const minor = major / 5 >= 10 ? major / 5 : major;
  const gridStyle: CSSProperties = {
    backgroundImage: [
      "linear-gradient(to right, var(--color-grid-major) 1px, transparent 1px)",
      "linear-gradient(to bottom, var(--color-grid-major) 1px, transparent 1px)",
      "linear-gradient(to right, var(--color-grid-minor) 1px, transparent 1px)",
      "linear-gradient(to bottom, var(--color-grid-minor) 1px, transparent 1px)",
    ].join(", "),
    backgroundSize: `${major}px ${major}px, ${major}px ${major}px, ${minor}px ${minor}px, ${minor}px ${minor}px`,
    backgroundPosition: `${view.x}px ${view.y}px`,
  };

  const cursor = panning
    ? "grabbing"
    : spaceHeld
      ? "grab"
      : tool === "select"
        ? "default"
        : "crosshair";

  // Colors of the frames around what other people have selected.
  const peerOutlines = new Map<string, string>();
  for (const [, peer] of peers) {
    if (peer.selection) {
      peerOutlines.set(
        `${peer.selection.kind}:${peer.selection.id}`,
        peer.color
      );
    }
  }

  const scaleBar = scaleBarLength(zoom, unit);

  // The primitive's root: the surface that's panned, zoomed and drawn on.
  // Everything floating over the plan sits outside of it, so scrolling the
  // properties panel doesn't pan the plan underneath.
  const surface = usePart(
    plan,
    "root",
    {},
    {
      ref: surfaceRef,
      "aria-label": "Floor plan",
      className:
        "absolute inset-0 touch-none overflow-hidden bg-canvas select-none",
      style: { ...gridStyle, cursor },
      onPointerDownCapture: handlePointerDownCapture,
      onPointerDown: handlePointerDown,
      onPointerMove: handlePointerMove,
      onPointerUp: handlePointerEnd,
      onPointerCancel: handlePointerEnd,
      onPointerLeave: handlePointerLeave,
      onClick: handleClick,
      onContextMenu: (event) => event.preventDefault(),
      children: (
        <svg
          className="block h-full w-full"
          style={{ visibility: ready ? "visible" : "hidden" }}
        >
          <FloorPatterns />

          <g transform={`translate(${view.x} ${view.y}) scale(${zoom})`}>
            {/* The plan itself, bottom to top. While a drawing tool is active
              nothing on it can be grabbed: every press goes to the tool. */}
            <g
              pointerEvents={
                tool === "select" && !spaceHeld ? undefined : "none"
              }
            >
              {roomList.map((room) => (
                <g
                  key={room.id}
                  style={{
                    cursor: selectedRoom?.id === room.id ? "move" : undefined,
                  }}
                >
                  <RoomFloor
                    room={room}
                    onPointerDown={handleRoomPointerDown}
                  />
                </g>
              ))}

              {furnitureList.map((item) => (
                <FurnitureShape
                  key={item.id}
                  item={item}
                  onPointerDown={handleFurniturePointerDown}
                />
              ))}

              {roomList.map((room) => (
                <RoomWalls
                  key={room.id}
                  room={room}
                  zoom={zoom}
                  onWallPointerDown={handleWallPointerDown}
                />
              ))}

              {selectedRoom ? (
                <RoomHandles
                  room={selectedRoom}
                  zoom={zoom}
                  onCornerPointerDown={handleCornerPointerDown}
                  onMidpointPointerDown={handleMidpointPointerDown}
                />
              ) : null}

              {/* Openings go over every wall, so a door in a wall shared by
                two rooms cuts through both. */}
              {[...openings.values()].map((opening) => {
                const wall = findWall(rooms, opening.roomId, opening.wallId);
                if (!wall) {
                  return null;
                }
                const selected =
                  selection?.kind === "opening" && selection.id === opening.id;
                return (
                  <OpeningShape
                    key={opening.id}
                    opening={opening}
                    wall={wall}
                    zoom={zoom}
                    outline={
                      selected
                        ? "var(--color-brand)"
                        : peerOutlines.get(`opening:${opening.id}`)
                    }
                    onPointerDown={(event) =>
                      handleOpeningPointerDown(event, opening)
                    }
                  />
                );
              })}
            </g>

            {/* Annotations: never in the way of the pointer. */}
            <g pointerEvents="none">
              {roomList.map((room) => (
                <RoomLabel key={room.id} room={room} zoom={zoom} unit={unit} />
              ))}

              {roomList.map((room) =>
                showDimensions || selectedRoom?.id === room.id ? (
                  <RoomDimensions
                    key={room.id}
                    room={room}
                    zoom={zoom}
                    unit={unit}
                    accent={selectedRoom?.id === room.id}
                  />
                ) : null
              )}

              {selection?.kind === "opening" ? (
                <OpeningDimension
                  opening={openings.get(selection.id)}
                  rooms={rooms}
                  zoom={zoom}
                  unit={unit}
                />
              ) : null}

              {peers.map(([connectionId, peer]) =>
                peer.selection ? (
                  <PeerSelection
                    key={connectionId}
                    selection={peer.selection}
                    name={peer.name}
                    color={peer.color}
                    rooms={rooms}
                    openings={openings}
                    furniture={furniture}
                    zoom={zoom}
                  />
                ) : null
              )}

              {placement && (tool === "door" || tool === "window") ? (
                <OpeningShape
                  opening={{
                    kind: tool,
                    style: "single",
                    offset: placement.offset,
                    width: placement.width,
                    hinge: "start",
                    swing: "in",
                  }}
                  wall={placement.wall}
                  zoom={zoom}
                  outline="var(--color-brand)"
                  ghost
                />
              ) : null}

              {draft ? (
                <DraftRoom a={draft.a} b={draft.b} zoom={zoom} unit={unit} />
              ) : null}

              {guides.x !== null ? (
                <line
                  className="plan-guide"
                  x1={guides.x}
                  y1={visible.top}
                  x2={guides.x}
                  y2={visible.bottom}
                />
              ) : null}
              {guides.y !== null ? (
                <line
                  className="plan-guide"
                  x1={visible.left}
                  y1={guides.y}
                  x2={visible.right}
                  y2={guides.y}
                />
              ) : null}
            </g>

            {selectedFurniture && tool === "select" ? (
              <FurnitureHandles
                item={selectedFurniture}
                zoom={zoom}
                unit={unit}
                onResizePointerDown={handleResizePointerDown}
                onRotatePointerDown={handleRotatePointerDown}
              />
            ) : null}
          </g>
        </svg>
      ),
    },
    "div"
  );

  return (
    <div className="relative h-full w-full overflow-hidden bg-canvas">
      {surface}

      <Cursors view={view} />

      {ready && rooms.size === 0 && tool === "select" ? (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-6">
          <div className="pointer-events-auto max-w-64 pb-16 text-center">
            <p className="text-sm font-medium text-ink">Start with a room</p>
            <p className="mt-1 text-[13px] leading-snug text-ink-muted">
              Pick the Room tool and drag on the canvas to draw your first room.
            </p>
            <Button
              variant="primary"
              size="sm"
              onClick={() => onToolChange("room")}
              className="mt-3"
            >
              Draw a room
            </Button>
          </div>
        </div>
      ) : null}

      {/* Scale bar, like the one in the corner of a drawing. */}
      <div className="pointer-events-none absolute bottom-3 left-3 hidden flex-col gap-1 sm:flex">
        <span className="font-mono text-[10px] leading-none text-ink-muted">
          {scaleBar.label}
        </span>
        <span
          className="h-1.5 border-x border-b border-ink-muted"
          style={{ width: scaleBar.cm * zoom }}
        />
      </div>

      <div className="card absolute right-3 bottom-3 flex items-center p-0.5">
        <ZoomButton label="Zoom out" onClick={plan.api.zoomOut}>
          <MinusIcon />
        </ZoomButton>
        <span className="w-10 text-center text-[11px] text-ink-secondary tabular-nums">
          {Math.round(zoom * 100)}%
        </span>
        <ZoomButton label="Zoom in" onClick={plan.api.zoomIn}>
          <PlusIcon />
        </ZoomButton>
        <span className="mx-0.5 h-4 w-px bg-line" />
        <ZoomButton label="Zoom to fit" shortcut="mod+0" onClick={fit}>
          <MaximizeIcon />
        </ZoomButton>
      </div>

      {children}
    </div>
  );
}

function ZoomButton({
  label,
  shortcut,
  onClick,
  children,
}: {
  label: string;
  shortcut?: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <Tooltip shortcut={shortcut}>
      <TooltipTrigger
        render={<Button size="icon-sm" aria-label={label} onClick={onClick} />}
      >
        {children}
      </TooltipTrigger>
      <TooltipContent side="top">
        {label}
        <TooltipShortcut />
      </TooltipContent>
    </Tooltip>
  );
}

/**
 * Hatches for floor finishes, in plan units so planks and tiles are true to
 * scale. They start from the plan's origin, so they line up across rooms.
 */
function FloorPatterns() {
  return (
    <defs>
      <pattern
        id="floor-wood"
        width={120}
        height={30}
        patternUnits="userSpaceOnUse"
      >
        <path
          className="plan-hatch"
          d="M 0 0.5 H 120 M 0 15.5 H 120 M 40 0 V 15 M 100 15 V 30"
        />
      </pattern>
      <pattern
        id="floor-tile"
        width={40}
        height={40}
        patternUnits="userSpaceOnUse"
      >
        <path className="plan-hatch" d="M 0 0.5 H 40 M 0.5 0 V 40" />
      </pattern>
      <pattern
        id="floor-carpet"
        width={14}
        height={14}
        patternUnits="userSpaceOnUse"
      >
        <circle className="plan-stipple" cx={3.5} cy={3.5} r={0.9} />
        <circle className="plan-stipple" cx={10.5} cy={10.5} r={0.9} />
      </pattern>
    </defs>
  );
}

/** The room being drawn with the Room tool, with its two dimensions. */
function DraftRoom({
  a,
  b,
  zoom,
  unit,
}: {
  a: Point;
  b: Point;
  zoom: number;
  unit: Unit;
}) {
  const left = Math.min(a.x, b.x);
  const right = Math.max(a.x, b.x);
  const top = Math.min(a.y, b.y);
  const bottom = Math.max(a.y, b.y);
  const gap = WALL_THICKNESS / 2 + 16 / zoom;
  return (
    <>
      <rect
        className="plan-draft"
        x={left}
        y={top}
        width={right - left}
        height={bottom - top}
      />
      <Dimension
        a={{ x: left, y: top }}
        b={{ x: right, y: top }}
        normal={{ x: 0, y: -1 }}
        gap={gap}
        label={formatLength(right - left, unit)}
        zoom={zoom}
        accent
      />
      <Dimension
        a={{ x: left, y: top }}
        b={{ x: left, y: bottom }}
        normal={{ x: -1, y: 0 }}
        gap={gap}
        label={formatLength(bottom - top, unit)}
        zoom={zoom}
        accent
      />
    </>
  );
}

/**
 * For the selected door or window: how far it is from either end of its
 * wall, the measurement that matters when placing one.
 */
function OpeningDimension({
  opening,
  rooms,
  zoom,
  unit,
}: {
  opening: Opening | undefined;
  rooms: ReadonlyMap<string, Room>;
  zoom: number;
  unit: Unit;
}) {
  const wall = opening && findWall(rooms, opening.roomId, opening.wallId);
  if (!opening || !wall) {
    return null;
  }
  const { offset, width } = fitOpening(opening, wall);
  const start = add(wall.a, scale(wall.dir, offset - width / 2));
  const end = add(wall.a, scale(wall.dir, offset + width / 2));
  const normal = scale(wall.inward, -1);
  const gap = WALL_THICKNESS / 2 + 16 / zoom;
  return (
    <>
      <Dimension
        a={wall.a}
        b={start}
        normal={normal}
        gap={gap}
        label={formatLength(offset - width / 2, unit)}
        zoom={zoom}
      />
      <Dimension
        a={start}
        b={end}
        normal={normal}
        gap={gap}
        label={formatLength(width, unit)}
        zoom={zoom}
        accent
      />
      <Dimension
        a={end}
        b={wall.b}
        normal={normal}
        gap={gap}
        label={formatLength(wall.length - offset - width / 2, unit)}
        zoom={zoom}
      />
    </>
  );
}

/**
 * What someone else has selected: an outline in their color with their name
 * on it. (Openings draw their own frame; only the name is added here.)
 */
function PeerSelection({
  selection,
  name,
  color,
  rooms,
  openings,
  furniture,
  zoom,
}: {
  selection: Selection;
  name: string;
  color: string;
  rooms: ReadonlyMap<string, Room>;
  openings: ReadonlyMap<string, Opening>;
  furniture: ReadonlyMap<string, Furniture>;
  zoom: number;
}) {
  let anchor: Point;
  let shape: ReactNode = null;

  if (selection.kind === "furniture") {
    const item = furniture.get(selection.id);
    if (!item) {
      return null;
    }
    const extents = furnitureExtents(item);
    anchor = { x: item.x - extents.x, y: item.y - extents.y };
    shape = (
      <rect
        className="plan-outline"
        style={{ stroke: color }}
        transform={`translate(${item.x} ${item.y}) rotate(${item.rotation})`}
        x={-item.width / 2}
        y={-item.depth / 2}
        width={item.width}
        height={item.depth}
      />
    );
  } else if (selection.kind === "room") {
    const room = rooms.get(selection.id);
    const bounds = room && boundsOf(room.points);
    if (!room || !bounds) {
      return null;
    }
    anchor = {
      x: bounds.minX - WALL_THICKNESS / 2,
      y: bounds.minY - WALL_THICKNESS / 2,
    };
    shape = (
      <polygon
        className="plan-outline"
        style={{ stroke: color }}
        points={room.points.map((point) => `${point.x},${point.y}`).join(" ")}
      />
    );
  } else {
    const opening = openings.get(selection.id);
    const wall = opening && findWall(rooms, opening.roomId, opening.wallId);
    if (!opening || !wall) {
      return null;
    }
    const { center, width } = fitOpening(opening, wall);
    anchor = {
      x: center.x - (Math.abs(wall.dir.x) * width) / 2 - WALL_THICKNESS / 2,
      y: center.y - (Math.abs(wall.dir.y) * width) / 2 - WALL_THICKNESS / 2,
    };
  }

  return (
    <>
      {shape}
      <text
        className="plan-peer-label"
        x={anchor.x}
        y={anchor.y - 6 / zoom}
        fontSize={11 / zoom}
        strokeWidth={4 / zoom}
        style={{ fill: color }}
      >
        {name}
      </text>
    </>
  );
}
