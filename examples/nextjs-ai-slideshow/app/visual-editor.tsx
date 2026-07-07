"use client";

import { useRoom } from "@liveblocks/react/suspense";
import { getYjsProviderForRoom } from "@liveblocks/yjs";
import diff from "fast-diff";
import { useEffect, useRef } from "react";
import * as Y from "yjs";
import { findElementSourceRange, getElementPath } from "./html-source-map";
import { getSlideText } from "./slide-doc";

const HOVER_ATTR = "data-lb-hover";
const SELECTED_ATTR = "data-lb-selected";
const STYLE_ATTR = "data-lb-visual-editor-style";
const DRAG_THRESHOLD = 3;

const INLINE_TEXT_TAGS = new Set([
  "a",
  "abbr",
  "b",
  "br",
  "button",
  "cite",
  "code",
  "em",
  "i",
  "kbd",
  "mark",
  "small",
  "span",
  "strong",
  "sub",
  "sup",
  "time",
  "u",
  "s",
]);

type RelativeAnchor = ReturnType<typeof Y.createRelativePositionFromTypeIndex>;

type GestureContext = {
  ydoc: Y.Doc;
  ytext: Y.Text;
  startAnchor: RelativeAnchor | null;
  endAnchor: RelativeAnchor | null;
  tagName: string;
  fallbackToWholeDocument: boolean;
  initialOuterHtml: string;
};

type PointerGesture = {
  context: GestureContext;
  element: Element;
  pointerId: number;
  startX: number;
  startY: number;
  initialTransform: string;
  initialTranslate: Coords;
  dragStarted: boolean;
};

type TextEditGesture = {
  context: GestureContext;
  element: HTMLElement;
  originalInnerHtml: string;
  finishing: boolean;
  removeListeners: () => void;
};

type Coords = { x: number; y: number };

export type VisualEditorOptions = {
  iframe: HTMLIFrameElement | null;
  slideId: string;
  editing: boolean;
  onGestureActiveChange: (active: boolean) => void;
  onCommit: (expectedHtml: string) => void;
};

export function useVisualEditor({
  iframe,
  slideId,
  editing,
  onGestureActiveChange,
  onCommit,
}: VisualEditorOptions) {
  const room = useRoom();
  const hoveredElementRef = useRef<Element | null>(null);
  const selectedElementRef = useRef<Element | null>(null);
  const selectedPathRef = useRef<number[] | null>(null);
  const pointerGestureRef = useRef<PointerGesture | null>(null);
  const textEditRef = useRef<TextEditGesture | null>(null);
  const documentCleanupRef = useRef<(() => void) | null>(null);
  const gestureActiveRef = useRef(false);
  const callbacksRef = useRef({ onGestureActiveChange, onCommit });

  useEffect(() => {
    callbacksRef.current = { onGestureActiveChange, onCommit };
  }, [onGestureActiveChange, onCommit]);

  useEffect(() => {
    selectedElementRef.current = null;
    hoveredElementRef.current = null;
    selectedPathRef.current = null;
    pointerGestureRef.current = null;
    finishTextEdit("cancel");
    setGestureActive(false);
  }, [slideId]);

  useEffect(() => {
    if (!iframe) {
      return;
    }

    const attach = () => {
      documentCleanupRef.current?.();
      documentCleanupRef.current = null;

      const document = iframe.contentDocument;
      if (!document) {
        return;
      }

      if (!editing) {
        cleanupDocument(document);
        clearHover();
        clearSelection();
        pointerGestureRef.current = null;
        finishTextEdit("cancel");
        setGestureActive(false);
        return;
      }

      injectEditorStyle(document);
      reapplySelection(document);

      const handlePointerMove = (event: PointerEvent) => {
        updateHoverFromEvent(document, event);
        updatePointerGesture(event);
      };

      const handlePointerDown = (event: PointerEvent) => {
        startPointerGesture(document, event);
      };

      const handlePointerUp = (event: PointerEvent) => {
        finishPointerGesture(event, "commit");
      };

      const handlePointerCancel = (event: PointerEvent) => {
        finishPointerGesture(event, "cancel");
      };

      const handleDoubleClick = (event: MouseEvent) => {
        startTextEdit(document, event);
      };

      document.addEventListener("pointermove", handlePointerMove);
      document.addEventListener("pointerdown", handlePointerDown);
      document.addEventListener("pointerup", handlePointerUp);
      document.addEventListener("pointercancel", handlePointerCancel);
      document.addEventListener("dblclick", handleDoubleClick);

      documentCleanupRef.current = () => {
        document.removeEventListener("pointermove", handlePointerMove);
        document.removeEventListener("pointerdown", handlePointerDown);
        document.removeEventListener("pointerup", handlePointerUp);
        document.removeEventListener("pointercancel", handlePointerCancel);
        document.removeEventListener("dblclick", handleDoubleClick);
      };
    };

    iframe.addEventListener("load", attach);
    attach();

    return () => {
      iframe.removeEventListener("load", attach);
      documentCleanupRef.current?.();
      documentCleanupRef.current = null;
    };
  }, [editing, iframe, room, slideId]);

  function setGestureActive(active: boolean) {
    if (gestureActiveRef.current === active) {
      return;
    }

    gestureActiveRef.current = active;
    callbacksRef.current.onGestureActiveChange(active);
  }

  function createGestureContext(element: Element): GestureContext | null {
    const document = element.ownerDocument;
    const body = document.body;
    if (!body) {
      return null;
    }

    const provider = getYjsProviderForRoom(room);
    const ydoc = provider.getYDoc();
    const ytext = getSlideText(ydoc, slideId);
    const snapshotHtml = ytext.toString();
    const path = getElementPath(element, body);
    const range = path ? findElementSourceRange(snapshotHtml, path) : null;

    return {
      ydoc,
      ytext,
      startAnchor: range
        ? Y.createRelativePositionFromTypeIndex(ytext, range.start, 0)
        : null,
      endAnchor: range
        ? Y.createRelativePositionFromTypeIndex(ytext, range.end, -1)
        : null,
      tagName: element.tagName.toLowerCase(),
      fallbackToWholeDocument: !range,
      initialOuterHtml: serializeElement(element),
    };
  }

  function startPointerGesture(document: Document, event: PointerEvent) {
    if (event.button !== 0 || textEditRef.current) {
      return;
    }

    const target = getTargetElement(document, event);
    if (!target) {
      clearSelection();
      return;
    }

    const context = createGestureContext(target);
    if (!context) {
      return;
    }

    event.preventDefault();
    selectElement(target);
    try {
      target.setPointerCapture(event.pointerId);
    } catch {
      // Pointer capture can fail if the iframe loses the pointer mid-gesture.
    }
    const initialTransform = isHtmlElement(target) ? target.style.transform : "";

    pointerGestureRef.current = {
      context,
      element: target,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      initialTransform,
      initialTranslate: parseTranslate(initialTransform),
      dragStarted: false,
    };
    setGestureActive(true);
  }

  function updatePointerGesture(event: PointerEvent) {
    const gesture = pointerGestureRef.current;
    if (!gesture || gesture.pointerId !== event.pointerId) {
      return;
    }

    const deltaX = event.clientX - gesture.startX;
    const deltaY = event.clientY - gesture.startY;
    const distance = Math.hypot(deltaX, deltaY);
    if (!gesture.dragStarted && distance < DRAG_THRESHOLD) {
      return;
    }

    gesture.dragStarted = true;
    event.preventDefault();

    const nextX = gesture.initialTranslate.x + deltaX;
    const nextY = gesture.initialTranslate.y + deltaY;
    if (isHtmlElement(gesture.element)) {
      gesture.element.style.transform = updateTranslate(
        gesture.initialTransform,
        nextX,
        nextY
      );
    }
  }

  function finishPointerGesture(
    event: PointerEvent,
    action: "commit" | "cancel"
  ) {
    const gesture = pointerGestureRef.current;
    if (!gesture || gesture.pointerId !== event.pointerId) {
      return;
    }

    pointerGestureRef.current = null;
    try {
      gesture.element.releasePointerCapture(event.pointerId);
    } catch {
      // The browser may already have released capture on pointer cancel.
    }

    if (action === "cancel" && isHtmlElement(gesture.element)) {
      gesture.element.style.transform = gesture.initialTransform;
    }

    if (action === "commit" && gesture.dragStarted) {
      commitElementGesture(gesture.context, gesture.element);
    }

    setGestureActive(false);
  }

  function startTextEdit(document: Document, event: MouseEvent) {
    const target = getTargetElement(document, event);
    if (!target || !isHtmlElement(target) || !isInlineOnlyElement(target)) {
      return;
    }

    const context = createGestureContext(target);
    if (!context) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    pointerGestureRef.current = null;
    selectElement(target);
    setGestureActive(true);

    target.contentEditable = "true";
    target.focus({ preventScroll: true });
    selectElementContents(target);

    const handleBlur = () => {
      finishTextEdit("commit");
    };

    const handleKeyDown = (keyboardEvent: KeyboardEvent) => {
      if (keyboardEvent.key === "Escape") {
        keyboardEvent.preventDefault();
        finishTextEdit("cancel");
        return;
      }

      if (keyboardEvent.key === "Enter" && (keyboardEvent.metaKey || keyboardEvent.ctrlKey)) {
        keyboardEvent.preventDefault();
        finishTextEdit("commit");
      }
    };

    target.addEventListener("blur", handleBlur);
    target.addEventListener("keydown", handleKeyDown);

    textEditRef.current = {
      context,
      element: target,
      originalInnerHtml: target.innerHTML,
      finishing: false,
      removeListeners: () => {
        target.removeEventListener("blur", handleBlur);
        target.removeEventListener("keydown", handleKeyDown);
      },
    };
  }

  function finishTextEdit(action: "commit" | "cancel") {
    const edit = textEditRef.current;
    if (!edit || edit.finishing) {
      return;
    }

    edit.finishing = true;
    textEditRef.current = null;
    edit.removeListeners();

    if (action === "cancel") {
      edit.element.innerHTML = edit.originalInnerHtml;
    }

    edit.element.removeAttribute("contenteditable");

    if (action === "commit") {
      const nextOuterHtml = serializeElement(edit.element);
      if (nextOuterHtml !== edit.context.initialOuterHtml) {
        commitElementGesture(edit.context, edit.element);
      }
    }

    setGestureActive(false);
  }

  function commitElementGesture(context: GestureContext, element: Element) {
    const nextOuterHtml = serializeElement(element);
    if (nextOuterHtml === context.initialOuterHtml) {
      return;
    }

    if (context.fallbackToWholeDocument) {
      commitWholeDocument(context, element.ownerDocument);
      return;
    }

    if (!context.startAnchor || !context.endAnchor) {
      return;
    }

    const start = Y.createAbsolutePositionFromRelativePosition(
      context.startAnchor,
      context.ydoc
    );
    const end = Y.createAbsolutePositionFromRelativePosition(
      context.endAnchor,
      context.ydoc
    );

    if (
      !start ||
      !end ||
      start.type !== context.ytext ||
      end.type !== context.ytext ||
      end.index <= start.index
    ) {
      return;
    }

    const currentHtml = context.ytext.toString();
    if (!startsWithTagName(currentHtml.slice(start.index, end.index), context.tagName)) {
      commitWholeDocument(context, element.ownerDocument);
      return;
    }

    const expectedHtml =
      currentHtml.slice(0, start.index) +
      nextOuterHtml +
      currentHtml.slice(end.index);
    if (expectedHtml === currentHtml) {
      return;
    }

    context.ydoc.transact(() => {
      context.ytext.delete(start.index, end.index - start.index);
      context.ytext.insert(start.index, nextOuterHtml);
    });
    callbacksRef.current.onCommit(expectedHtml);
  }

  function commitWholeDocument(context: GestureContext, document: Document) {
    const nextHtml = serializeDocument(document);
    const currentHtml = context.ytext.toString();
    if (nextHtml === currentHtml) {
      return;
    }

    context.ydoc.transact(() => {
      applyHtmlDiff(context.ytext, nextHtml);
    });
    callbacksRef.current.onCommit(nextHtml);
  }

  function selectElement(element: Element) {
    if (selectedElementRef.current === element) {
      return;
    }

    selectedElementRef.current?.removeAttribute(SELECTED_ATTR);
    selectedElementRef.current = element;
    selectedElementRef.current.setAttribute(SELECTED_ATTR, "");

    const body = element.ownerDocument.body;
    selectedPathRef.current = body ? getElementPath(element, body) : null;
  }

  function clearSelection() {
    selectedElementRef.current?.removeAttribute(SELECTED_ATTR);
    selectedElementRef.current = null;
    selectedPathRef.current = null;
  }

  function clearHover() {
    hoveredElementRef.current?.removeAttribute(HOVER_ATTR);
    hoveredElementRef.current = null;
  }

  function updateHoverFromEvent(document: Document, event: PointerEvent) {
    if (pointerGestureRef.current || textEditRef.current) {
      return;
    }

    const target = getTargetElement(document, event);
    if (hoveredElementRef.current === target) {
      return;
    }

    hoveredElementRef.current?.removeAttribute(HOVER_ATTR);
    hoveredElementRef.current = target;
    hoveredElementRef.current?.setAttribute(HOVER_ATTR, "");
  }

  function reapplySelection(document: Document) {
    selectedElementRef.current = null;
    hoveredElementRef.current = null;

    const path = selectedPathRef.current;
    if (!path || !document.body) {
      clearSelection();
      return;
    }

    const element = getElementByPath(document.body, path);
    if (element) {
      selectElement(element);
    } else {
      clearSelection();
    }
  }
}

function injectEditorStyle(document: Document) {
  if (document.querySelector(`style[${STYLE_ATTR}]`)) {
    return;
  }

  const style = document.createElement("style");
  style.setAttribute(STYLE_ATTR, "");
  style.textContent = `
    [${HOVER_ATTR}] {
      outline: 2px solid rgba(253, 81, 8, 0.35) !important;
      outline-offset: 2px !important;
      cursor: move;
    }
    [${SELECTED_ATTR}] {
      outline: 3px solid rgb(253 81 8) !important;
      outline-offset: 2px !important;
    }
    [contenteditable="true"] {
      cursor: text;
      user-select: text;
    }
  `;

  (document.head ?? document.documentElement).appendChild(style);
}

function getTargetElement(document: Document, event: Event): Element | null {
  const view = document.defaultView;
  const target = event.target;
  if (!view || !target) {
    return null;
  }

  let element: Element | null = null;
  if (target instanceof view.Element) {
    element = target;
  } else if (target instanceof view.Text) {
    element = target.parentElement;
  }

  if (
    !element ||
    element === document.documentElement ||
    element === document.body ||
    !document.body?.contains(element)
  ) {
    return null;
  }

  return element;
}

function isHtmlElement(element: Element): element is HTMLElement {
  const view = element.ownerDocument.defaultView;
  return !!view && element instanceof view.HTMLElement;
}

function isInlineOnlyElement(element: Element): boolean {
  for (const child of element.children) {
    if (!INLINE_TEXT_TAGS.has(child.tagName.toLowerCase())) {
      return false;
    }

    if (!isInlineOnlyElement(child)) {
      return false;
    }
  }

  return true;
}

function selectElementContents(element: Element) {
  const document = element.ownerDocument;
  const selection = document.getSelection();
  if (!selection) {
    return;
  }

  const range = document.createRange();
  range.selectNodeContents(element);
  selection.removeAllRanges();
  selection.addRange(range);
}

function getElementByPath(root: Element, path: number[]): Element | null {
  let element: Element = root;

  for (const index of path) {
    const child = element.children.item(index);
    if (!child) {
      return null;
    }
    element = child;
  }

  return element === root ? null : element;
}

function parseTranslate(transform: string): Coords {
  const match = transform.match(
    /translate\(\s*(-?\d+(?:\.\d+)?)px(?:\s*,\s*|\s+)(-?\d+(?:\.\d+)?)px\s*\)/i
  );
  if (!match) {
    return { x: 0, y: 0 };
  }

  return {
    x: Number(match[1]),
    y: Number(match[2]),
  };
}

function updateTranslate(transform: string, x: number, y: number): string {
  const nextTranslate = `translate(${formatPx(x)}, ${formatPx(y)})`;
  if (
    /translate\(\s*-?\d+(?:\.\d+)?px(?:\s*,\s*|\s+)-?\d+(?:\.\d+)?px\s*\)/i.test(
      transform
    )
  ) {
    return transform.replace(
      /translate\(\s*-?\d+(?:\.\d+)?px(?:\s*,\s*|\s+)-?\d+(?:\.\d+)?px\s*\)/i,
      nextTranslate
    );
  }

  return transform ? `${transform} ${nextTranslate}` : nextTranslate;
}

function formatPx(value: number): string {
  const rounded = Math.round(value * 100) / 100;
  return `${Object.is(rounded, -0) ? 0 : rounded}px`;
}

function serializeElement(element: Element): string {
  const clone = element.cloneNode(true);
  const view = element.ownerDocument.defaultView;
  if (!view || !(clone instanceof view.Element)) {
    return "";
  }

  stripEditorArtifacts(clone);
  return clone.outerHTML;
}

function serializeDocument(document: Document): string {
  const clone = document.documentElement.cloneNode(true);
  const view = document.defaultView;
  if (!view || !(clone instanceof view.Element)) {
    return "";
  }

  stripEditorArtifacts(clone);
  return `<!doctype html>\n${clone.outerHTML}`;
}

function stripEditorArtifacts(root: Element) {
  if (root.matches(`style[${STYLE_ATTR}]`)) {
    root.remove();
    return;
  }

  for (const style of root.querySelectorAll(`style[${STYLE_ATTR}]`)) {
    style.remove();
  }

  const selector = `[${HOVER_ATTR}], [${SELECTED_ATTR}], [contenteditable]`;
  if (root.matches(selector)) {
    removeEditorAttributes(root);
  }

  for (const element of root.querySelectorAll(selector)) {
    removeEditorAttributes(element);
  }
}

function cleanupDocument(document: Document) {
  cleanupElement(document.documentElement);
}

function cleanupElement(root: Element) {
  stripEditorArtifacts(root);
}

function removeEditorAttributes(element: Element) {
  element.removeAttribute(HOVER_ATTR);
  element.removeAttribute(SELECTED_ATTR);
  element.removeAttribute("contenteditable");
}

function startsWithTagName(html: string, tagName: string): boolean {
  return new RegExp(`^\\s*<${escapeRegExp(tagName)}(?:\\s|>|/)`, "i").test(html);
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function applyHtmlDiff(ytext: Y.Text, nextHtml: string) {
  let index = 0;
  for (const [operation, text] of diff(ytext.toString(), nextHtml)) {
    if (operation === diff.EQUAL) {
      index += text.length;
    } else if (operation === diff.DELETE) {
      ytext.delete(index, text.length);
    } else if (operation === diff.INSERT) {
      ytext.insert(index, text);
      index += text.length;
    }
  }
}
