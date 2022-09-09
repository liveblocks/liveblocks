import { useStorage, useSelf } from "../../liveblocks.config";
import { Layer, XYWH } from "../types";
import { shallow } from "@liveblocks/react";

function boundingBox(layers: Layer[]): XYWH | null {
  if (layers.length === 0) {
    return null;
  }

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

export default function useSelectionBounds() {
  const selection = useSelf((me) => me.presence.selection);
  return useStorage((root) => {
    const selectedLayers = selection.map(
      (layerId) => root.layers.get(layerId)!
    );
    return boundingBox(selectedLayers);
  }, shallow);
}
