import {
  Color,
  Side,
  EllipseLayer,
  Layer,
  LayerType,
  Point,
  XYWH,
  PathLayer,
  Camera,
} from "./types";
import type { LiveObject, LiveMap } from "@liveblocks/client";

export function colorToCss(color: Color) {
  return `#${color.r.toString(16).padStart(2, "0")}${color.g
    .toString(16)
    .padStart(2, "0")}${color.b.toString(16).padStart(2, "0")}`;
}

const COLORS = ["#DC2626", "#D97706", "#059669", "#7C3AED", "#DB2777"];

export function connectionIdToColor(connectionId: number): string {
  return COLORS[connectionId % COLORS.length];
}

export function resizeBounds(bounds: XYWH, corner: Side, point: Point): XYWH {
  const result = {
    x: bounds.x,
    y: bounds.y,
    width: bounds.width,
    height: bounds.height,
  };

  if ((corner & Side.Left) === Side.Left) {
    result.x = Math.min(point.x, bounds.x + bounds.width);
    result.width = Math.abs(bounds.x + bounds.width - point.x);
  }

  if ((corner & Side.Right) === Side.Right) {
    result.x = Math.min(point.x, bounds.x);
    result.width = Math.abs(point.x - bounds.x);
  }

  if ((corner & Side.Top) === Side.Top) {
    result.y = Math.min(point.y, bounds.y + bounds.height);
    result.height = Math.abs(bounds.y + bounds.height - point.y);
  }

  if ((corner & Side.Bottom) === Side.Bottom) {
    result.y = Math.min(point.y, bounds.y);
    result.height = Math.abs(point.y - bounds.y);
  }

  return result;
}

export function findIntersectingLayerWithPoint(
  layerIds: string[],
  layers: Map<string, Layer>,
  point: Point
) {
  for (let i = layerIds.length - 1; i >= 0; i--) {
    const layerId = layerIds[i];
    const layer = layers.get(layerId);
    if (layer && isHittingLayer(layer, point)) {
      return layerId;
    }
  }

  return null;
}

export function isHittingLayer(layer: Layer, point: Point) {
  switch (layer.type) {
    case LayerType.Ellipse:
      return isHittingEllipse(layer, point);
    // TODO: Implement path hit testing instead of using Rectangle hit box
    case LayerType.Path:
    case LayerType.Rectangle:
      return isHittingRectangle(layer, point);
    default:
      return false;
  }
}

export function isHittingRectangle(layer: XYWH, point: Point) {
  return (
    point.x > layer.x &&
    point.x < layer.x + layer.width &&
    point.y > layer.y &&
    point.y < layer.y + layer.height
  );
}

export function isHittingEllipse(layer: EllipseLayer, point: Point) {
  const rx = layer.width / 2;
  const ry = layer.height / 2;
  const cx = layer.x + layer.width / 2;
  const cy = layer.y + layer.height / 2;

  const result =
    Math.pow(point.x - cx, 2) / Math.pow(rx, 2) +
    Math.pow(point.y - cy, 2) / Math.pow(ry, 2);

  return result <= 1;
}

/**
 * TODO: Implement ellipse and path / selection net collision
 */
export function findIntersectingLayersWithRectangle(
  layerIds: readonly string[],
  layers: ReadonlyMap<string, Layer>,
  a: Point,
  b: Point
) {
  const rect = {
    x: Math.min(a.x, b.x),
    y: Math.min(a.y, b.y),
    width: Math.abs(a.x - b.x),
    height: Math.abs(a.y - b.y),
  };

  const ids = [];

  for (const layerId of layerIds) {
    const layer = layers.get(layerId);
    if (layer == null) {
      continue;
    }

    const { x, y, height, width } = layer;
    if (
      rect.x + rect.width > x &&
      rect.x < x + width &&
      rect.y + rect.height > y &&
      rect.y < y + height
    ) {
      ids.push(layerId);
    }
  }

  return ids;
}

export function getMutableSelectedLayers(
  layers: LiveMap<string, LiveObject<Layer>>,
  selection: string[]
): LiveObject<Layer>[] {
  const result = [];
  for (const id of selection) {
    const layer = layers.get(id);
    if (layer) {
      result.push(layer);
    }
  }
  return result;
}

function getSelectedLayers(
  layers: ReadonlyMap<string, Layer>,
  selection: string[]
): Layer[] {
  const result = [];
  for (const id of selection) {
    const layer = layers.get(id);
    if (layer) {
      result.push(layer);
    }
  }
  return result;
}

export function boundingBox(
  allLayers: ReadonlyMap<string, Layer>,
  selection: string[]
): XYWH | null {
  if (selection.length === 0) {
    return null;
  }

  const layers = getSelectedLayers(allLayers, selection);

  if (layers.length === 0) {
    return null;
  }

  let left = layers[0].x;
  let right = layers[0].x + layers[0].width;
  let top = layers[0].y;
  let bottom = layers[0].y + layers[0].height;

  for (let i = 1; i < layers.length; i++) {
    const { x, y, width, height } = layers[i];
    if (left > x) {
      left = x;
    }
    if (right < x + width) {
      right = x + width;
    }
    if (top > y) {
      top = y;
    }
    if (bottom < y + height) {
      bottom = y + height;
    }
  }

  return {
    x: left,
    y: top,
    width: right - left,
    height: bottom - top,
  };
}

export function getSvgPathFromStroke(stroke: number[][]) {
  if (!stroke.length) return "";

  const d = stroke.reduce(
    (acc, [x0, y0], i, arr) => {
      const [x1, y1] = arr[(i + 1) % arr.length];
      acc.push(x0, y0, (x0 + x1) / 2, (y0 + y1) / 2);
      return acc;
    },
    ["M", ...stroke[0], "Q"]
  );

  d.push("Z");
  return d.join(" ");
}

export function penPointsToPathLayer(
  points: number[][],
  color: Color
): PathLayer {
  if (points.length < 2) {
    throw new Error("Can't transform points with less than 2 points");
  }

  let left = Number.POSITIVE_INFINITY;
  let top = Number.POSITIVE_INFINITY;
  let right = Number.NEGATIVE_INFINITY;
  let bottom = Number.NEGATIVE_INFINITY;

  for (const point of points) {
    const [x, y] = point;
    if (left > x) {
      left = x;
    }
    if (top > y) {
      top = y;
    }
    if (right < x) {
      right = x;
    }
    if (bottom < y) {
      bottom = y;
    }
  }

  return {
    type: LayerType.Path,
    x: left,
    y: top,
    width: right - left,
    height: bottom - top,
    fill: color,
    points: points.map(([x, y, pressure]) => [x - left, y - top, pressure]),
  };
}

export function pointerEventToCanvasPoint(
  e: React.PointerEvent,
  camera: Camera
): Point {
  return {
    x: Math.round(e.clientX) - camera.x,
    y: Math.round(e.clientY) - camera.y,
  };
}
