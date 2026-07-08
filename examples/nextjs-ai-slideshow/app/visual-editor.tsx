"use client";

import { useRoom } from "@liveblocks/react/suspense";
import { getYjsProviderForRoom } from "@liveblocks/yjs";
import diff from "fast-diff";
import { useEffect, useRef } from "react";
import * as Y from "yjs";
import {
  findElementSourceRange,
  getElementByPath,
  getElementPath,
} from "./html-source-map";
import { getSlideText } from "./slide-doc";
import { SLIDE_HEIGHT, SLIDE_WIDTH } from "./slide-html";
import { VISUAL_EDIT_ORIGIN } from "./slide-undo";

const HOVER_ATTR = "data-lb-hover";
const SELECTED_ATTR = "data-lb-selected";
const STYLE_ATTR = "data-lb-visual-editor-style";
const DRAG_THRESHOLD = 3;
const STREAM_COMMIT_INTERVAL = 100;
const CURSOR_PRESENCE_INTERVAL = 50;

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
  lastCommittedOuterHtml: string;
  dropped: boolean;
};

type ThrottledAction = {
  schedule: () => void;
  flush: () => void;
  cancel: () => void;
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
  streamCommit: ThrottledAction | null;
};

type TextEditGesture = {
  context: GestureContext;
  element: HTMLElement;
  originalInnerHtml: string;
  finishing: boolean;
  streamCommit: ThrottledAction | null;
  removeListeners: () => void;
};

type Coords = { x: number; y: number };

export type VisualEditorOptions = {
  iframe: HTMLIFrameElement | null;
  slideId: string;
  onGestureActiveChange: (active: boolean) => void;
  onCommit: (expectedHtml: string) => void;
  onCursorMove: (coords: Coords | null) => void;
  onSelectionChange: (path: number[] | null) => void;
  stopCapturing: () => void;
  onUndo: () => void;
  onRedo: () => void;
};

// True for Mod-z / Mod-Shift-z / Mod-y. Returns the action or null.
export function matchUndoRedoShortcut(
  event: KeyboardEvent
): "undo" | "redo" | null {
  if (!event.metaKey && !event.ctrlKey) {
    return null;
  }
  const key = event.key.toLowerCase();
  if (key === "z") {
    return event.shiftKey ? "redo" : "undo";
  }
  if (key === "y") {
    return "redo";
  }
  return null;
}

export function useVisualEditor({
  iframe,
  slideId,
  onGestureActiveChange,
  onCommit,
  onCursorMove,
  onSelectionChange,
  stopCapturing,
  onUndo,
  onRedo,
}: VisualEditorOptions) {
  const room = useRoom();
  const hoveredElementRef = useRef<Element | null>(null);
  const selectedElementRef = useRef<Element | null>(null);
  const selectedPathRef = useRef<number[] | null>(null);
  const pointerGestureRef = useRef<PointerGesture | null>(null);
  const textEditRef = useRef<TextEditGesture | null>(null);
  const documentCleanupRef = useRef<(() => void) | null>(null);
  const gestureActiveRef = useRef(false);
  const latestCursorCoordsRef = useRef<Coords | null>(null);
  const callbacksRef = useRef({
    onGestureActiveChange,
    onCommit,
    onCursorMove,
    onSelectionChange,
    stopCapturing,
    onUndo,
    onRedo,
  });

  useEffect(() => {
    callbacksRef.current = {
      onGestureActiveChange,
      onCommit,
      onCursorMove,
      onSelectionChange,
      stopCapturing,
      onUndo,
      onRedo,
    };
  }, [
    onCommit,
    onCursorMove,
    onGestureActiveChange,
    onRedo,
    onSelectionChange,
    onUndo,
    stopCapturing,
  ]);

  useEffect(() => {
    selectedElementRef.current = null;
    hoveredElementRef.current = null;
    selectedPathRef.current = null;
    pointerGestureRef.current = null;
    finishTextEdit("cancel");
    callbacksRef.current.onCursorMove(null);
    setGestureActive(false);
  }, [slideId]);

  useEffect(() => {
    if (!iframe) {
      clearHover();
      clearSelection();
      pointerGestureRef.current = null;
      finishTextEdit("cancel");
      callbacksRef.current.onCursorMove(null);
      setGestureActive(false);
      return;
    }

    const attach = () => {
      documentCleanupRef.current?.();
      documentCleanupRef.current = null;

      const document = iframe.contentDocument;
      if (!document) {
        return;
      }

      injectEditorStyle(document);
      reapplySelection(document);
      const cursorMove = createThrottledAction(CURSOR_PRESENCE_INTERVAL, () => {
        const coords = latestCursorCoordsRef.current;
        callbacksRef.current.onCursorMove(coords);
      });

      const handlePointerMove = (event: PointerEvent) => {
        latestCursorCoordsRef.current = {
          x: clamp01(event.clientX / SLIDE_WIDTH),
          y: clamp01(event.clientY / SLIDE_HEIGHT),
        };
        cursorMove.schedule();
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

      const handlePointerLeave = () => {
        latestCursorCoordsRef.current = null;
        cursorMove.cancel();
        callbacksRef.current.onCursorMove(null);
        clearHover();
      };

      // Mod-z / Mod-y while focus is inside the slide iframe. Disabled during
      // inline text editing, where the browser's native contentEditable undo
      // should keep handling the keystrokes.
      const handleKeyDown = (event: KeyboardEvent) => {
        if (textEditRef.current) {
          return;
        }
        const action = matchUndoRedoShortcut(event);
        if (!action) {
          return;
        }
        event.preventDefault();
        if (action === "undo") {
          callbacksRef.current.onUndo();
        } else {
          callbacksRef.current.onRedo();
        }
      };

      document.addEventListener("pointermove", handlePointerMove);
      document.addEventListener("pointerleave", handlePointerLeave);
      document.addEventListener("pointerdown", handlePointerDown);
      document.addEventListener("pointerup", handlePointerUp);
      document.addEventListener("pointercancel", handlePointerCancel);
      document.addEventListener("dblclick", handleDoubleClick);
      document.addEventListener("keydown", handleKeyDown);

      documentCleanupRef.current = () => {
        cursorMove.cancel();
        document.removeEventListener("pointermove", handlePointerMove);
        document.removeEventListener("pointerleave", handlePointerLeave);
        document.removeEventListener("pointerdown", handlePointerDown);
        document.removeEventListener("pointerup", handlePointerUp);
        document.removeEventListener("pointercancel", handlePointerCancel);
        document.removeEventListener("dblclick", handleDoubleClick);
        document.removeEventListener("keydown", handleKeyDown);
      };
    };

    iframe.addEventListener("load", attach);
    attach();

    return () => {
      iframe.removeEventListener("load", attach);
      documentCleanupRef.current?.();
      documentCleanupRef.current = null;
    };
  }, [iframe, room, slideId]);

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
      lastCommittedOuterHtml: serializeElement(element),
      dropped: false,
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
      streamCommit: context.fallbackToWholeDocument
        ? null
        : createThrottledAction(STREAM_COMMIT_INTERVAL, () => {
            commitElementGesture(context, target);
          }),
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

    if (!gesture.dragStarted) {
      gesture.dragStarted = true;
      callbacksRef.current.stopCapturing();
    }
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
    gesture.streamCommit?.schedule();
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
      gesture.streamCommit?.cancel();
      gesture.element.style.transform = gesture.initialTransform;
    }

    if (action === "commit" && gesture.dragStarted) {
      gesture.streamCommit?.flush();
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
    callbacksRef.current.stopCapturing();
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

      if (keyboardEvent.key === "Enter") {
        keyboardEvent.preventDefault();
        if (keyboardEvent.metaKey || keyboardEvent.ctrlKey) {
          finishTextEdit("commit");
          return;
        }
        // The browser's default Enter behavior wraps lines in nested <div>s
        // (breaking the element's markup); insert a plain <br> instead.
        insertLineBreak(target);
        streamCommit?.schedule();
      }
    };

    const streamCommit = context.fallbackToWholeDocument
      ? null
      : createThrottledAction(STREAM_COMMIT_INTERVAL, () => {
          commitElementGesture(context, target);
        });

    const handleInput = () => {
      streamCommit?.schedule();
    };

    target.addEventListener("blur", handleBlur);
    target.addEventListener("keydown", handleKeyDown);
    target.addEventListener("input", handleInput);

    textEditRef.current = {
      context,
      element: target,
      originalInnerHtml: target.innerHTML,
      finishing: false,
      streamCommit,
      removeListeners: () => {
        target.removeEventListener("blur", handleBlur);
        target.removeEventListener("keydown", handleKeyDown);
        target.removeEventListener("input", handleInput);
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
      edit.streamCommit?.cancel();
      edit.element.innerHTML = edit.originalInnerHtml;
    } else {
      edit.streamCommit?.flush();
    }

    edit.element.removeAttribute("contenteditable");

    if (action === "commit" || action === "cancel") {
      const nextOuterHtml = serializeElement(edit.element);
      if (nextOuterHtml !== edit.context.lastCommittedOuterHtml) {
        commitElementGesture(edit.context, edit.element);
      }
    }

    setGestureActive(false);
  }

  function commitElementGesture(context: GestureContext, element: Element) {
    if (context.dropped) {
      return;
    }

    const nextOuterHtml = serializeElement(element);
    if (nextOuterHtml === context.lastCommittedOuterHtml) {
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
      context.dropped = true;
      return;
    }

    const currentHtml = context.ytext.toString();
    if (!startsWithTagName(currentHtml.slice(start.index, end.index), context.tagName)) {
      context.dropped = true;
      return;
    }

    const expectedHtml =
      currentHtml.slice(0, start.index) +
      nextOuterHtml +
      currentHtml.slice(end.index);
    if (expectedHtml === currentHtml) {
      context.lastCommittedOuterHtml = nextOuterHtml;
      return;
    }

    context.ydoc.transact(() => {
      context.ytext.delete(start.index, end.index - start.index);
      context.ytext.insert(start.index, nextOuterHtml);
    }, VISUAL_EDIT_ORIGIN);
    context.startAnchor = Y.createRelativePositionFromTypeIndex(
      context.ytext,
      start.index,
      0
    );
    context.endAnchor = Y.createRelativePositionFromTypeIndex(
      context.ytext,
      start.index + nextOuterHtml.length,
      -1
    );
    context.lastCommittedOuterHtml = nextOuterHtml;
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
    }, VISUAL_EDIT_ORIGIN);
    context.lastCommittedOuterHtml = serializeElement(document.documentElement);
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
    const path = body ? getElementPath(element, body) : null;
    if (!pathsEqual(selectedPathRef.current, path)) {
      callbacksRef.current.onSelectionChange(path);
    }
    selectedPathRef.current = path;
  }

  function clearSelection() {
    selectedElementRef.current?.removeAttribute(SELECTED_ATTR);
    selectedElementRef.current = null;
    if (selectedPathRef.current) {
      callbacksRef.current.onSelectionChange(null);
    }
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

const ZERO_WIDTH_SPACE = "\u200B";

function insertLineBreak(element: HTMLElement) {
  const document = element.ownerDocument;
  const selection = document.getSelection();
  if (!selection || selection.rangeCount === 0) {
    return;
  }

  const range = selection.getRangeAt(0);
  if (!element.contains(range.startContainer)) {
    return;
  }
  range.deleteContents();

  const br = document.createElement("br");
  range.insertNode(br);

  // Anchor the caret in a zero-width-space text node AFTER the break:
  // placing it directly between the <br> and a preceding text node makes the
  // browser normalize it back into that text node, so typing would land
  // before the break. The marker also keeps the new line rendered while
  // empty. Zero-width spaces are stripped again at serialization time.
  const marker = document.createTextNode(ZERO_WIDTH_SPACE);
  br.after(marker);

  range.setStart(marker, marker.length);
  range.collapse(true);
  selection.removeAllRanges();
  selection.addRange(range);
}

function stripZeroWidthSpaces(root: Element) {
  const walker = root.ownerDocument.createTreeWalker(
    root,
    NodeFilter.SHOW_TEXT
  );
  const emptied: Node[] = [];
  while (walker.nextNode()) {
    const node = walker.currentNode;
    if (node.nodeValue?.includes(ZERO_WIDTH_SPACE)) {
      node.nodeValue = node.nodeValue.replaceAll(ZERO_WIDTH_SPACE, "");
      if (node.nodeValue === "") {
        emptied.push(node);
      }
    }
  }
  for (const node of emptied) {
    node.parentNode?.removeChild(node);
  }
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
  stripZeroWidthSpaces(clone);
  return clone.outerHTML;
}

function serializeDocument(document: Document): string {
  const clone = document.documentElement.cloneNode(true);
  const view = document.defaultView;
  if (!view || !(clone instanceof view.Element)) {
    return "";
  }

  stripEditorArtifacts(clone);
  stripZeroWidthSpaces(clone);
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

function createThrottledAction(delay: number, callback: () => void): ThrottledAction {
  let timer: number | null = null;
  let pending = false;

  const run = () => {
    timer = null;
    if (!pending) {
      return;
    }

    pending = false;
    callback();
  };

  return {
    schedule: () => {
      pending = true;
      if (timer !== null) {
        return;
      }
      timer = window.setTimeout(run, delay);
    },
    flush: () => {
      if (timer !== null) {
        window.clearTimeout(timer);
        timer = null;
      }
      run();
    },
    cancel: () => {
      if (timer !== null) {
        window.clearTimeout(timer);
        timer = null;
      }
      pending = false;
    },
  };
}

function clamp01(value: number) {
  return Math.min(1, Math.max(0, value));
}

function pathsEqual(left: number[] | null, right: number[] | null): boolean {
  if (left === right) {
    return true;
  }

  if (!left || !right || left.length !== right.length) {
    return false;
  }

  return left.every((value, index) => value === right[index]);
}
