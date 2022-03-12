export const CanvasMode = {
  /**
   * Default canvas mode. Nothing is happening.
   */
  None: "None",
  /**
   * When the user's pointer is pressed
   */
  Pressing: "Pressing",
  /**
   * When the user is selecting multiple layers at once
   */
  SelectionNe: "SelectionNet",
  /**
   * When the user is moving layers
   */
  Translating: "Translating",
  /**
   * When the user is going to insert a Rectangle or an Ellipse
   */
  Inserting: "Inserting",
};

export const COLORS = ["#DC2626", "#D97706", "#059669", "#7C3AED", "#DB2777"];

export function connectionIdToColor(connectionId) {
  return COLORS[connectionId % COLORS.length];
}

export function pointerEventToCanvasPoint(e, camera) {
  return {
    x: Math.round(e.clientX) - camera.x,
    y: Math.round(e.clientY) - camera.y,
  };
}

export function colorToCss(color) {
  return `#${color.r.toString(16).padStart(2, "0")}${color.g
    .toString(16)
    .padStart(2, "0")}${color.b.toString(16).padStart(2, "0")}`;
}

/**
 * TODO: Implement ellipse and path / selection net collision
 */
export function findIntersectingLayersWithRectangle(layerIds, layers, a, b) {
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

    const { x, y, height, width } = layer.toObject();
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

export function boundingBox(allLayers, selection) {
  if (selection.length === 0) {
    return null;
  }

  const layers = getSelectedLayers(allLayers, selection).map((l) =>
    l.toObject()
  );

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

export function getSelectedLayers(layers, selection) {
  const result = [];
  for (const id of selection) {
    const layer = layers.get(id);
    if (layer) {
      result.push(layer);
    }
  }
  return result;
}
