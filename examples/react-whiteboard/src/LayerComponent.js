import { useRoom } from "@liveblocks/react";
import React, { memo, useEffect, useState } from "react";

const LayerComponent = memo(
  ({ layer, onLayerPointerDown, id, selectionColor }) => {
    const [layerData, setLayerData] = useState(layer.toObject());

    const room = useRoom();

    useEffect(() => {
      function onChange() {
        setLayerData(layer.toObject());
      }

      return room.subscribe(layer, onChange);
    }, [room, layer]);

    const { x, y, width, height, fill } = layerData;

    return (
      <rect
        onPointerDown={(e) => onLayerPointerDown(e, id)}
        style={{
          transition: "all 0.1s ease",
          transform: `translate(${x}px, ${y}px)`,
        }}
        x={0}
        y={0}
        width={width}
        height={height}
        fill={fill ? fill : "#CCC"}
        strokeWidth={1}
        stroke={selectionColor || "transparent"}
      />
    );
  }
);

export default LayerComponent;
