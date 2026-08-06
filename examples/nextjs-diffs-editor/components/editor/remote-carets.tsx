"use client";

import { useEffect, useState } from "react";
import type { RemoteSelection } from "@/lib/livetext-binding";
import { offsetToPosition } from "@/lib/text-positions";

type Rect = { left: number; top: number; width: number; height: number };

type CaretView = {
  key: string;
  left: number;
  top: number;
  height: number;
  color: string;
  name?: string;
};

type HighlightView = Rect & { key: string; color: string };

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

  useEffect(() => {
    if (container === null) {
      return;
    }

    let frame = 0;
    let observedRoot: ShadowRoot | null = null;
    let shadowObserver: MutationObserver | null = null;

    const schedule = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(compute);
    };

    const compute = () => {
      // The file surface renders inside an open shadow root on the
      // <diffs-container> custom element, so the line rows can't be reached
      // with a regular querySelector from the outside.
      const host = container.querySelector("diffs-container");
      const root = host?.shadowRoot ?? null;
      const content = root?.querySelector("[data-content]") ?? null;
      if (root === null || content === null) {
        setCarets([]);
        setHighlights([]);
        return;
      }

      if (observedRoot !== root) {
        // First time the shadow root is available (or it was replaced):
        // scroll events and DOM mutations inside a shadow tree don't cross
        // its boundary, so listen and observe on the shadow root itself.
        shadowObserver?.disconnect();
        observedRoot?.removeEventListener("scroll", schedule, true);
        observedRoot = root;
        shadowObserver = new MutationObserver(schedule);
        shadowObserver.observe(root, {
          childList: true,
          subtree: true,
          characterData: true,
        });
        root.addEventListener("scroll", schedule, true);
      }

      const docText = getDocumentText();
      const lines = docText.split("\n");
      const base = container.getBoundingClientRect();
      const nextCarets: CaretView[] = [];
      const nextHighlights: HighlightView[] = [];

      for (const selection of selections) {
        const color = selection.color ?? "#888888";
        selection.ranges.forEach((range, index) => {
          const key = `${selection.connectionId}:${index}`;

          const caretRect = rectAtOffset(content, docText, range.head);
          if (caretRect !== null) {
            nextCarets.push({
              key,
              left: caretRect.left - base.left,
              top: caretRect.top - base.top,
              height: caretRect.height,
              color,
              // Only label the primary caret to avoid stacked name flags
              // when someone uses multiple cursors.
              name: index === 0 ? selection.name : undefined,
            });
          }

          if (range.anchor !== range.head) {
            const from = Math.min(range.anchor, range.head);
            const to = Math.max(range.anchor, range.head);
            for (const rect of selectionRects(content, docText, lines, from, to)) {
              nextHighlights.push({
                key: `${key}:${nextHighlights.length}`,
                left: rect.left - base.left,
                top: rect.top - base.top,
                width: rect.width,
                height: rect.height,
                color,
              });
            }
          }
        });
      }

      setCarets(nextCarets);
      setHighlights(nextHighlights);
    };

    schedule();
    // The outer wrapper scrolls vertically; the code area scrolls inside the
    // shadow root (handled above once the shadow root is resolved).
    container.addEventListener("scroll", schedule, true);
    window.addEventListener("resize", schedule);
    // Catches the <diffs-container> host being mounted after the first
    // render, and re-measures after light-DOM re-renders.
    const observer = new MutationObserver(schedule);
    observer.observe(container, {
      childList: true,
      subtree: true,
      characterData: true,
    });

    return () => {
      cancelAnimationFrame(frame);
      container.removeEventListener("scroll", schedule, true);
      window.removeEventListener("resize", schedule);
      observer.disconnect();
      shadowObserver?.disconnect();
      observedRoot?.removeEventListener("scroll", schedule, true);
    };
  }, [container, selections, getDocumentText]);

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
          className="absolute rounded-xs opacity-25"
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
              className="absolute -top-[1.35rem] left-0 whitespace-nowrap rounded-sm rounded-bl-none px-1.5 py-0.5 text-[0.65rem] font-medium text-white"
              style={{ backgroundColor: caret.color }}
            >
              {caret.name}
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
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
      rects.push({ left: rect.left, top: rect.top, width: 4, height: rect.height });
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
