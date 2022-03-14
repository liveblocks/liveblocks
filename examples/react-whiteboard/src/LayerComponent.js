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

    return (
      <div
        onPointerDown={(e) => onLayerPointerDown(e, id)}
        style={{
          transition: "all 0.1s ease",
          transform: `translate(${layerData.x}px, ${layerData.y}px)`,
          height: layerData.height,
          width: layerData.width,
          backgroundColor: layerData.fill ? layerData.fill : "#CCC",
          strokeWidth: 1,
          borderStyle: "solid",
          borderWidth: "2px",
          borderColor: selectionColor || "transparent",
        }}
      ></div>
    );
  }
);

export default LayerComponent;
