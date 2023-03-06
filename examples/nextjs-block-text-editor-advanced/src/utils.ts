import { nanoid } from "nanoid";
import { Editor, Element, Path, Transforms } from "slate";
import { BlockType, Format, TitleElement, Theme } from "./types";

export function toPx(value: number | undefined): string | undefined {
  return value ? `${Math.round(value)}px` : undefined;
}

export const makeNodeId = () => nanoid(16);

export function isNotUndefined<T>(value: T | undefined): value is T {
  return value !== undefined;
}

export function toggleMark(editor: Editor, format: Format) {
  const isActive = isMarkActive(editor, format);

  if (isActive) {
    Editor.removeMark(editor, format);
  } else {
    Editor.addMark(editor, format, true);
  }
}

export function isMarkActive(editor: Editor, format: Format) {
  const marks = Editor.marks(editor);
  return marks ? marks[format] === true : false;
}

export function topLevelPath(path: Path): Path {
  return path.slice(0, 1);
}

export function applyTheme(theme: Theme) {
  const htmlElement = document.querySelector("html");
  if (!htmlElement) {
    return;
  }

  htmlElement.className = `theme-${theme}`;
}

type CursorType = "grab" | "grabbing";

export function setGlobalCursor(type: CursorType) {
  document.body.classList.add(type);
}

export function removeGlobalCursor(type: CursorType) {
  document.body.classList.remove(type);
}
