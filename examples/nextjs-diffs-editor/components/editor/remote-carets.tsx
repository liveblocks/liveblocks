"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type RefObject,
  type SetStateAction,
} from "react";
import type { RemoteSelection } from "@/lib/livetext-binding";
import { offsetToPosition } from "@/lib/text-positions";

type Rect = { left: number; top: number; width: number; height: number };

type CaretView = {
  key: string;
  connectionId: number;
  left: number;
  top: number;
  height: number;
  color: string;
  name?: string;
  avatar?: string;
};

type HighlightView = Rect & {
  key: string;
  connectionId: number;
  color: string;
};

/** Extra pixels around remote selection hit targets. */
const HOVER_PADDING = 3;

/** Ignore sub-pixel layout jitter from syntax re-highlighting. */
const POSITION_TOLERANCE = 2;

type RemoteCaretsProps = {
  /** The scrollable element wrapping the rendered `<File>` surface. */
  container: HTMLElement | null;
  selections: RemoteSelection[];
  /** The editor's current document text, used to convert offsets to lines. */
  getDocumentText: () => string;
};

/**
 * Draws other users' carets and selections on top of the editable file
 * surface. Positions are measured from the rendered line rows (the
 * `[data-line]` elements produced by `@pierre/diffs`), so they stay accurate
 * across syntax highlighting spans and proportional gutters.
 */
export function RemoteCarets({
  container,
  selections,
  getDocumentText,
}: RemoteCaretsProps) {
  const [carets, setCarets] = useState<CaretView[]>([]);
  const [highlights, setHighlights] = useState<HighlightView[]>([]);
  const [hoveredConnectionId, setHoveredConnectionId] = useState<number | null>(
    null
  );
  const selectionsRef = useRef(selections);
  selectionsRef.current = selections;
  const getDocumentTextRef = useRef(getDocumentText);
  getDocumentTextRef.current = getDocumentText;
  const hitRegionsRef = useRef<{
    carets: CaretView[];
    highlights: HighlightView[];
  }>({ carets: [], highlights: [] });
  const lastPointerRef = useRef<{ x: number; y: number } | null>(null);
  const measureFrameRef = useRef(0);

  const scheduleMeasure = useCallback((targetContainer: HTMLElement) => {
    cancelAnimationFrame(measureFrameRef.current);
    measureFrameRef.current = requestAnimationFrame(() => {
      applyMeasuredCarets(
        targetContainer,
        selectionsRef.current,
        getDocumentTextRef.current(),
        hitRegionsRef,
        setCarets,
        setHighlights,
        lastPointerRef,
        setHoveredConnectionId
      );
    });
  }, []);

  useEffect(() => {
    if (container === null) {
      return;
    }

    let observedRoot: ShadowRoot | null = null;

    const compute = () => {
      scheduleMeasure(container);
    };

    const attachShadowScrollListener = () => {
      const host = container.querySelector("diffs-container");
      const root = host?.shadowRoot ?? null;
      if (root === null || observedRoot === root) {
        return false;
      }
      observedRoot?.removeEventListener("scroll", compute, true);
      observedRoot = root;
      root.addEventListener("scroll", compute, true);
      return true;
    };

    attachShadowScrollListener();
    scheduleMeasure(container);

    window.addEventListener("resize", compute);

    // Only re-measure when the editor surface first mounts.
    const mountObserver = new MutationObserver(() => {
      if (attachShadowScrollListener()) {
        scheduleMeasure(container);
      }
    });
    mountObserver.observe(container, { childList: true, subtree: true });

    return () => {
      cancelAnimationFrame(measureFrameRef.current);
      window.removeEventListener("resize", compute);
      mountObserver.disconnect();
      observedRoot?.removeEventListener("scroll", compute, true);
    };
  }, [container, scheduleMeasure]);

  // Re-measure when remote selections change.
  useEffect(() => {
    if (container === null) {
      return;
    }
    scheduleMeasure(container);
  }, [container, selections, scheduleMeasure]);

  // Hover labels are driven by hit-testing against measured regions so
  // highlights and an extended caret strip stay click-through.
  useEffect(() => {
    if (container === null) {
      return;
    }

    const handlePointerMove = (event: PointerEvent) => {
      lastPointerRef.current = { x: event.clientX, y: event.clientY };
      const base = getMeasureBase(container);
      if (base === null) {
        return;
      }
      const x = event.clientX - base.left;
      const y = event.clientY - base.top;
      const { carets, highlights } = hitRegionsRef.current;
      const next = hitTestRemoteSelection(x, y, carets, highlights);
      setHoveredConnectionId((current) => (current === next ? current : next));
    };

    const handlePointerLeave = () => {
      lastPointerRef.current = null;
      setHoveredConnectionId(null);
    };

    container.addEventListener("pointermove", handlePointerMove);
    container.addEventListener("pointerleave", handlePointerLeave);

    return () => {
      container.removeEventListener("pointermove", handlePointerMove);
      container.removeEventListener("pointerleave", handlePointerLeave);
    };
  }, [container]);

  return (
    <div
      aria-hidden="true"
      data-remote-carets=""
      className="pointer-events-none absolute inset-0 overflow-hidden"
    >
      {highlights.map((highlight) => (
        <div
          key={highlight.key}
          data-remote-selection=""
          className="absolute rounded-xs opacity-40"
          style={{
            left: highlight.left,
            top: highlight.top,
            width: Math.max(highlight.width, 4),
            height: highlight.height,
            backgroundColor: highlight.color,
          }}
        />
      ))}
      {carets.map((caret) => (
        <div
          key={caret.key}
          data-remote-caret=""
          className="absolute w-0.5"
          style={{
            left: caret.left,
            top: caret.top,
            height: caret.height,
            backgroundColor: caret.color,
          }}
        >
          {caret.name !== undefined ? (
            <div
              className="transition-opacity duration-100 delay-300 pointer-events-none absolute -top-4.75 left-0 whitespace-nowrap rounded-sm rounded-bl-none px-1 py-px text-[0.75rem] font-medium text-white"
              style={{
                backgroundColor: caret.color,
                opacity: hoveredConnectionId === caret.connectionId ? 1 : 0,
              }}
            >
              {caret.avatar !== undefined ? (
                <img
                  src={caret.avatar}
                  alt={caret.name ?? ""}
                  title={caret.name}
                  className="absolute -top-px -left-6 size-5.25 rounded-full"
                  // style={{ boxShadow: `0 0 0 1.5px ${caret.color}` }}
                  draggable={false}
                />
              ) : null}
              {caret.name}
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
}

function getMeasureBase(container: HTMLElement): DOMRect | null {
  const surface = container.querySelector("[data-editor-surface]") ?? container;
  return surface.getBoundingClientRect();
}

function applyMeasuredCarets(
  container: HTMLElement,
  selections: RemoteSelection[],
  docText: string,
  hitRegionsRef: RefObject<{
    carets: CaretView[];
    highlights: HighlightView[];
  }>,
  setCarets: Dispatch<SetStateAction<CaretView[]>>,
  setHighlights: Dispatch<SetStateAction<HighlightView[]>>,
  lastPointerRef: RefObject<{ x: number; y: number } | null>,
  setHoveredConnectionId: Dispatch<SetStateAction<number | null>>
): void {
  const host = container.querySelector("diffs-container");
  const root = host?.shadowRoot ?? null;
  const content = root?.querySelector("[data-content]") ?? null;
  if (root === null || content === null) {
    // Skip transient DOM states while the editor re-renders; clearing carets
    // here caused a visible flash on every keystroke.
    return;
  }

  const measured = measureRemoteCarets(container, content, selections, docText);
  hitRegionsRef.current = measured;

  setCarets((current) =>
    caretsEqual(current, measured.carets) ? current : measured.carets
  );
  setHighlights((current) =>
    highlightsEqual(current, measured.highlights)
      ? current
      : measured.highlights
  );

  const lastPointer = lastPointerRef.current;
  if (lastPointer !== null) {
    const base = getMeasureBase(container);
    if (base !== null) {
      const nextHovered = hitTestRemoteSelection(
        lastPointer.x - base.left,
        lastPointer.y - base.top,
        measured.carets,
        measured.highlights
      );
      setHoveredConnectionId((current) =>
        current === nextHovered ? current : nextHovered
      );
    }
  }
}

function measureRemoteCarets(
  container: HTMLElement,
  content: Element,
  selections: RemoteSelection[],
  docText: string
): { carets: CaretView[]; highlights: HighlightView[] } {
  const lines = docText.split("\n");
  const base = getMeasureBase(container);
  if (base === null) {
    return { carets: [], highlights: [] };
  }
  const carets: CaretView[] = [];
  const highlights: HighlightView[] = [];

  for (const selection of selections) {
    const color = selection.color ?? "#888888";
    selection.ranges.forEach((range, index) => {
      const key = `${selection.connectionId}:${index}`;

      const caretRect = rectAtOffset(content, docText, range.head);
      if (caretRect !== null) {
        carets.push({
          key,
          connectionId: selection.connectionId,
          left: roundPosition(caretRect.left - base.left),
          top: roundPosition(caretRect.top - base.top),
          height: roundPosition(caretRect.height),
          color,
          name: index === 0 ? selection.name : undefined,
          avatar: index === 0 ? selection.avatar : undefined,
        });
      }

      if (range.anchor !== range.head) {
        const from = Math.min(range.anchor, range.head);
        const to = Math.max(range.anchor, range.head);
        for (const rect of selectionRects(content, docText, lines, from, to)) {
          highlights.push({
            key: `${key}:${highlights.length}`,
            connectionId: selection.connectionId,
            left: roundPosition(rect.left - base.left),
            top: roundPosition(rect.top - base.top),
            width: roundPosition(rect.width),
            height: roundPosition(rect.height),
            color,
          });
        }
      }
    });
  }

  return { carets, highlights };
}

function roundPosition(value: number): number {
  return Math.round(value);
}

function nearlyEqual(a: number, b: number): boolean {
  return Math.abs(a - b) <= POSITION_TOLERANCE;
}

function caretsEqual(current: CaretView[], next: CaretView[]): boolean {
  if (current.length !== next.length) {
    return false;
  }
  for (let index = 0; index < current.length; index += 1) {
    const a = current[index];
    const b = next[index];
    if (
      a.key !== b.key ||
      !nearlyEqual(a.left, b.left) ||
      !nearlyEqual(a.top, b.top) ||
      !nearlyEqual(a.height, b.height) ||
      a.color !== b.color ||
      a.name !== b.name ||
      a.avatar !== b.avatar
    ) {
      return false;
    }
  }
  return true;
}

function highlightsEqual(
  current: HighlightView[],
  next: HighlightView[]
): boolean {
  if (current.length !== next.length) {
    return false;
  }
  for (let index = 0; index < current.length; index += 1) {
    const a = current[index];
    const b = next[index];
    if (
      a.key !== b.key ||
      !nearlyEqual(a.left, b.left) ||
      !nearlyEqual(a.top, b.top) ||
      !nearlyEqual(a.width, b.width) ||
      !nearlyEqual(a.height, b.height) ||
      a.color !== b.color
    ) {
      return false;
    }
  }
  return true;
}

/** Returns the connection id when `(x, y)` hits a highlight or caret strip. */
function hitTestRemoteSelection(
  x: number,
  y: number,
  carets: CaretView[],
  highlights: HighlightView[]
): number | null {
  for (const highlight of highlights) {
    if (
      x >= highlight.left &&
      x <= highlight.left + highlight.width &&
      y >= highlight.top - HOVER_PADDING &&
      y <= highlight.top + highlight.height + HOVER_PADDING
    ) {
      return highlight.connectionId;
    }
  }

  // Caret line is 2px (`w-0.5`); extend hit area by HOVER_PADDING each side.
  const caretWidth = 2;
  for (const caret of carets) {
    const left = caret.left - HOVER_PADDING;
    const right = caret.left + caretWidth + HOVER_PADDING;
    if (
      x >= left &&
      x <= right &&
      y >= caret.top &&
      y <= caret.top + caret.height
    ) {
      return caret.connectionId;
    }
  }

  return null;
}

/** Finds the text node (and offset within it) for a character on a line row. */
function locateCharacter(
  lineElement: Element,
  character: number
): [Text, number] | null {
  const walker = document.createTreeWalker(lineElement, NodeFilter.SHOW_TEXT);
  let remaining = character;
  let last: Text | null = null;
  for (let node = walker.nextNode(); node !== null; node = walker.nextNode()) {
    if (!(node instanceof Text)) {
      continue;
    }
    if (remaining <= node.data.length) {
      return [node, remaining];
    }
    remaining -= node.data.length;
    last = node;
  }
  // Character is past the rendered text: snap to the end of the line.
  return last === null ? null : [last, last.data.length];
}

function lineElementAt(content: Element, line: number): Element | null {
  return content.querySelector(`[data-line="${line + 1}"]`);
}

/** The screen rectangle of a collapsed caret at a document offset. */
function rectAtOffset(
  content: Element,
  docText: string,
  offset: number
): Rect | null {
  const position = offsetToPosition(docText, offset);
  const lineElement = lineElementAt(content, position.line);
  if (lineElement === null) {
    return null;
  }

  const located = locateCharacter(lineElement, position.character);
  if (located === null) {
    // Empty line (rendered as a lone <br>): use the row's left edge.
    const rect = lineElement.getBoundingClientRect();
    return { left: rect.left, top: rect.top, width: 0, height: rect.height };
  }

  const range = document.createRange();
  range.setStart(located[0], located[1]);
  range.collapse(true);
  const rect = range.getClientRects()[0];
  if (rect !== undefined) {
    return {
      left: rect.left,
      top: rect.top,
      width: 0,
      height: rect.height,
    };
  }
  const fallback = lineElement.getBoundingClientRect();
  return {
    left: fallback.left,
    top: fallback.top,
    width: 0,
    height: fallback.height,
  };
}

/** Per-line screen rectangles covering a document offset range. */
function selectionRects(
  content: Element,
  docText: string,
  lines: string[],
  from: number,
  to: number
): Rect[] {
  const start = offsetToPosition(docText, from);
  const end = offsetToPosition(docText, to);
  const rects: Rect[] = [];

  for (let line = start.line; line <= end.line; line++) {
    const lineElement = lineElementAt(content, line);
    if (lineElement === null) {
      continue;
    }

    const fromCharacter = line === start.line ? start.character : 0;
    const toCharacter =
      line === end.line ? end.character : (lines[line]?.length ?? 0);

    const startLocated = locateCharacter(lineElement, fromCharacter);
    const endLocated = locateCharacter(lineElement, toCharacter);
    if (startLocated === null || endLocated === null) {
      // Empty line inside the selection: show a thin marker at the row start.
      const rect = lineElement.getBoundingClientRect();
      rects.push({
        left: rect.left,
        top: rect.top,
        width: 4,
        height: rect.height,
      });
      continue;
    }

    const range = document.createRange();
    range.setStart(startLocated[0], startLocated[1]);
    range.setEnd(endLocated[0], endLocated[1]);
    const rect = range.getBoundingClientRect();
    rects.push({
      left: rect.left,
      top: rect.top,
      width: rect.width,
      height: rect.height,
    });
  }

  return rects;
}
