"use client";

import { shallow, useOthersMapped } from "@liveblocks/react/suspense";
import { Avatar } from "@liveblocks/react-ui";
import type { CSSProperties } from "react";
import { useLayoutEffect, useState } from "react";
import { offsetToPosition } from "./text-position";

type Rect = { left: number; top: number; width: number; height: number };

type LiveCaret = {
  connectionId: number;
  userInfo: Liveblocks["UserMeta"]["info"];
  caret: Rect;
  highlights: Rect[];
};

// Renders every other user's caret and selection highlight, from presence
export function LiveCarets({
  text,
  surfaceElement,
}: {
  text: string;
  surfaceElement: HTMLElement | null;
}) {
  const others = useOthersMapped(
    (other) => ({
      selection: other.presence.selection,
      userInfo: other.info,
    }),
    shallow
  );
  const [liveCarets, setLiveCarets] = useState<LiveCaret[]>([]);

  useLayoutEffect(() => {
    const contentElement = getContentElement(surfaceElement);
    const containerElement = surfaceElement?.closest(".editor-wrapper");
    if (
      !surfaceElement ||
      !contentElement ||
      !(containerElement instanceof HTMLElement)
    ) {
      return;
    }

    const containerRect = containerElement.getBoundingClientRect();
    const documentLength = text.length;

    function toLocalRect(rect: DOMRect): Rect {
      return {
        left: rect.left - containerRect.left,
        top: rect.top - containerRect.top,
        width: rect.width,
        height: rect.height,
      };
    }

    const next: LiveCaret[] = [];
    for (const [connectionId, data] of others) {
      const { selection, userInfo } = data;
      if (!selection) {
        continue;
      }

      const clamp = (offset: number) =>
        Math.max(0, Math.min(offset, documentLength));
      const anchor = clamp(selection.anchor);
      const focus = clamp(selection.focus);
      const start = Math.min(anchor, focus);
      const end = Math.max(anchor, focus);

      const startPoint = resolveOffset(contentElement, text, start);
      const endPoint = resolveOffset(contentElement, text, end);
      const focusPoint = resolveOffset(contentElement, text, focus);

      if (!startPoint || !endPoint || !focusPoint) {
        continue;
      }

      const selectionRange = document.createRange();
      selectionRange.setStart(startPoint.node, startPoint.offset);
      selectionRange.setEnd(endPoint.node, endPoint.offset);
      const highlights =
        start === end
          ? []
          : Array.from(selectionRange.getClientRects()).map(toLocalRect);

      // The caret sits at the focus, which is before the anchor when selecting backwards
      const caretRange = document.createRange();
      caretRange.setStart(focusPoint.node, focusPoint.offset);
      caretRange.collapse(true);
      let caretRect: DOMRect | undefined = caretRange.getClientRects()[0];
      if (!caretRect || caretRect.height === 0) {
        caretRect = focusPoint.lineElement.getBoundingClientRect();
      }

      next.push({
        connectionId,
        userInfo,
        caret: {
          ...toLocalRect(caretRect),
          width: 2,
        },
        highlights,
      });
    }

    setLiveCarets(next);
  }, [others, surfaceElement, text]);

  return (
    <div className="remote-selections" aria-hidden>
      {liveCarets.map(({ connectionId, userInfo, caret, highlights }) => (
        <div key={connectionId}>
          {highlights.map((rect, index) => (
            <div
              key={index}
              className="remote-highlight"
              style={{ ...rectStyle(rect), backgroundColor: userInfo.color }}
            />
          ))}
          <div
            className="remote-caret"
            style={{ ...rectStyle(caret), backgroundColor: userInfo.color }}
          >
            <span
              className="remote-caret-name"
              style={{ backgroundColor: userInfo.color }}
            >
              <Avatar
                name={userInfo.name}
                src={userInfo.avatar}
                className="remote-caret-avatar"
              />
              {userInfo.name}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

function rectStyle(rect: Rect): CSSProperties {
  return {
    left: rect.left,
    top: rect.top,
    width: rect.width,
    height: rect.height,
  };
}

function getContentElement(surfaceElement: HTMLElement | null) {
  const element = surfaceElement?.shadowRoot?.querySelector(
    "[data-code] [data-content]"
  );

  return element instanceof HTMLElement ? element : null;
}

function resolveOffset(
  contentElement: HTMLElement,
  text: string,
  offset: number
): { node: Node; offset: number; lineElement: HTMLElement } | null {
  const position = offsetToPosition(text, offset);
  const lineElement = contentElement.querySelector(
    `[data-line="${position.line + 1}"]`
  );

  if (!(lineElement instanceof HTMLElement)) {
    return null;
  }

  return {
    ...resolveTextPoint(lineElement, position.character),
    lineElement,
  };
}

function resolveTextPoint(
  element: HTMLElement,
  offset: number
): { node: Node; offset: number } {
  const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
  let remaining = offset;
  let lastTextNode: Text | null = null;

  let node = walker.nextNode();
  while (node) {
    if (node instanceof Text) {
      if (remaining <= node.length) {
        return { node, offset: remaining };
      }

      remaining -= node.length;
      lastTextNode = node;
    }

    node = walker.nextNode();
  }

  if (lastTextNode) {
    return { node: lastTextNode, offset: lastTextNode.length };
  }

  return { node: element, offset: 0 };
}
