type CursorType =
  | "grabbing"
  | "resizing-column"
  | "resizing-row"
  | "dragging-vertical"
  | "dragging-horizontal";

export function setGlobalCursor(type: CursorType) {
  document.body.classList.add(type);
}

export function removeGlobalCursor(type: CursorType) {
  document.body.classList.remove(type);
}
