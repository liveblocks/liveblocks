import { LiveMap, LiveObject } from "@liveblocks/client";
import { useState, useEffect } from "react";
import { Layer, XYWH } from "./types";
import { boundingBox } from "./utils";

export function useSelectionBounds(
  layers: LiveMap<string, LiveObject<Layer>>,
  selection: string[]
): XYWH | null {
  const [bounds, setBounds] = useState(boundingBox(layers, selection));

  useEffect(() => {
    onChange();

    function onChange() {
      setBounds(boundingBox(layers, selection));
    }

    // We need to subscribe to the layers map updates and to the updates on the layers themselves.
    // If User A deletes or modified a layer that is currently selected by UserB, the selection bounds needs to be refreshed.
    layers.subscribeDeep(onChange);

    return () => {
      layers.unsubscribeDeep(onChange);
    };
  }, [layers, selection]);

  return bounds;
}
