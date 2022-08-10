type CursorType =
  | "grabbing"
  | "scrubbing"
  | "grabbing"
  | "resizing-column"
  | "resizing-row";

export function setGlobalCursor(type: CursorType) {
  document.body.classList.add(type);
}

export function removeGlobalCursor(type: CursorType) {
  document.body.classList.remove(type);
}
