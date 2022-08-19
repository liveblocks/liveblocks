type CursorType =
  | "grabbing"
  | "grabbing"
  | "resizing-column"
  | "resizing-row"
  | "scrubbing";

export function setGlobalCursor(type: CursorType) {
  document.body.classList.add(type);
}

export function removeGlobalCursor(type: CursorType) {
  document.body.classList.remove(type);
}
