import { useRoom } from "@liveblocks/react";
import React, { memo, useEffect, useState } from "react";

import { CanvasMode, colorToCss } from "./utils";

function Rectangle({ layer, isAnimated, onPointerDown, id, selectionColor }) {
  const { x, y, width, height, fill } = layer;

  return (
    <rect
      onPointerDown={(e) => onPointerDown(e, id)}
      style={{
        transition: isAnimated ? "all 0.1s ease" : "",
        transform: `translate(${x}px, ${y}px)`,
      }}
      x={0}
      y={0}
      width={width}
      height={height}
      fill={fill ? colorToCss(fill) : "#CCC"}
      strokeWidth={1}
      stroke={selectionColor || "transparent"}
    />
  );
}

// We can use react memo because "layer" is a LiveObject and it's mutable. This component will only be re-rendered if the layer is updated.
const LayerComponent = memo(
  ({ layer, mode, onLayerPointerDown, id, selectionColor }) => {
    const [layerData, setLayerData] = useState(layer.toObject());

    const room = useRoom();

    // Layer is a nested LiveObject inside a LiveMap, so we need to subscribe to changes made to a specific layer
    useEffect(() => {
      function onChange() {
        setLayerData(layer.toObject());
      }

      return room.subscribe(layer, onChange);
    }, [room, layer]);

    const isAnimated =
      mode !== CanvasMode.Translating && mode !== CanvasMode.Resizing;

    return (
      <Rectangle
        id={id}
        layer={layerData}
        onPointerDown={onLayerPointerDown}
        isAnimated={isAnimated}
        selectionColor={selectionColor}
      />
    );
  }
);

export default LayerComponent;
