import { useStorage, useMyPresence } from "../../liveblocks.config";
import { useMemo } from "react";
import { XYWH } from "../types";
import { boundingBox } from "../utils";

export default function useSelectionBounds(): XYWH | null {
  const layers = useStorage((root) => root.layers);
  const [{ selection }] = useMyPresence();
  return useMemo(() => boundingBox(layers, selection), [layers, selection]);
}
