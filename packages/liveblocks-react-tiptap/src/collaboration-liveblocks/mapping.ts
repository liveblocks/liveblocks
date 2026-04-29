import type { Selection } from "@tiptap/pm/state";

export type LiveblocksTiptapPosition = {
  anchor: number;
  head: number;
};

export function selectionToLiveblocksPosition(
  selection: Selection
): LiveblocksTiptapPosition {
  return {
    anchor: selection.anchor,
    head: selection.head,
  };
}

export function clampLiveblocksPosition(
  position: LiveblocksTiptapPosition,
  max: number
): LiveblocksTiptapPosition {
  return {
    anchor: Math.max(0, Math.min(position.anchor, max)),
    head: Math.max(0, Math.min(position.head, max)),
  };
}
