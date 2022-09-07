import { LiveObject } from "@liveblocks/client";
import { useRoom } from "../../liveblocks.config";
import React, { memo, useEffect, useState } from "react";
import Ellipse from "./Ellipse";
import Path from "./Path";
import Rectangle from "./Rectangle";
import { CanvasMode, Layer, LayerType } from "../types";
import { colorToCss } from "../utils";

type Props = {
  id: string;
  layer: Layer;
  mode: CanvasMode;
  onLayerPointerDown: (e: React.PointerEvent, layerId: string) => void;
  selectionColor?: string;
};

// We can use react memo because "layer" is a LiveObject and it's mutable. This component will only be re-rendered if the layer is updated.
const LayerComponent = memo(
  ({ layer, mode, onLayerPointerDown, id, selectionColor }: Props) => {
    const isAnimated =
      mode !== CanvasMode.Translating && mode !== CanvasMode.Resizing;

    switch (layer.type) {
      case LayerType.Ellipse:
        return (
          <Ellipse
            id={id}
            layer={layer}
            onPointerDown={onLayerPointerDown}
            isAnimated={isAnimated}
            selectionColor={selectionColor}
          />
        );
      case LayerType.Path:
        return (
          <Path
            key={id}
            points={layer.points}
            isAnimated={isAnimated}
            onPointerDown={(e) => onLayerPointerDown(e, id)}
            x={layer.x}
            y={layer.y}
            fill={layer.fill ? colorToCss(layer.fill) : "#CCC"}
            stroke={selectionColor}
          />
        );
      case LayerType.Rectangle:
        return (
          <Rectangle
            id={id}
            layer={layer}
            onPointerDown={onLayerPointerDown}
            isAnimated={isAnimated}
            selectionColor={selectionColor}
          />
        );
      default:
        console.warn("Unknown layer type");
        return null;
    }
  }
);

export default LayerComponent;
