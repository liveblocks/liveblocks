import { LiveObject } from "@liveblocks/client";
import React, { memo, useEffect, useState } from "react";
import Ellipse from "./Ellipse";
import Path from "./Path";
import Rectangle from "./Rectangle";
import { CanvasMode, Layer, LayerType } from "./types";

type Props = {
  id: string;
  layer: LiveObject<Layer>;
  mode: CanvasMode;
  onLayerPointerDown: (e: React.PointerEvent, layerId: string) => void;
  selectionColor?: string;
};

// We can use react memo because "layer" is a LiveObject and it's mutable. This component will only be re-rendered if the layer is updated.
const LayerComponent = memo(
  ({ layer, mode, onLayerPointerDown, id, selectionColor }: Props) => {
    const [layerData, setLayerData] = useState(layer.toObject());

    // Layer is a nested LiveObject inside a LiveMap, so we need to subscribe to changes made to a specific layer
    useEffect(() => {
      function onChange() {
        setLayerData(layer.toObject());
      }

      layer.subscribe(onChange);

      return () => layer.unsubscribe(onChange);
    }, [layer]);

    const isAnimated =
      mode !== CanvasMode.Translating && mode !== CanvasMode.Resizing;

    switch (layerData.type) {
      case LayerType.Ellipse:
        return (
          <Ellipse
            id={id}
            layer={layerData}
            onPointerDown={onLayerPointerDown}
            isAnimated={isAnimated}
            selectionColor={selectionColor}
          />
        );
      case LayerType.Path:
        return (
          <Path
            id={id}
            layer={layerData}
            onPointerDown={onLayerPointerDown}
            isAnimated={isAnimated}
            selectionColor={selectionColor}
          />
        );
      case LayerType.Rectangle:
        return (
          <Rectangle
            id={id}
            layer={layerData}
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
