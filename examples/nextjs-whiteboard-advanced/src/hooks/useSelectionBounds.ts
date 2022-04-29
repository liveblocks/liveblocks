import { LiveMap, LiveObject } from "@liveblocks/client";
import { useRoom } from "@liveblocks/react";
import { useState, useEffect } from "react";
import { Layer, XYWH } from "../types";
import { boundingBox } from "../utils";

export default function useSelectionBounds(
  layers: LiveMap<string, LiveObject<Layer>>,
  selection: string[]
): XYWH | null {
  const [bounds, setBounds] = useState(boundingBox(layers, selection));
  const room = useRoom();

  useEffect(() => {
    function onChange() {
      setBounds(boundingBox(layers, selection));
    }

    onChange();

    // We need to subscribe to the layers map updates and to the updates on the layers themselves.
    // If User A deletes or modified a layer that is currently selected by UserB, the selection bounds needs to be refreshed.
    return room.subscribe(layers, onChange, { isDeep: true });
  }, [room, layers, selection]);

  return bounds;
}
