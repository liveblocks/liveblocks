"use client";

import type { LiveTextData } from "@liveblocks/client";
import { shallow, useOthersMapped } from "@liveblocks/react/suspense";
import { Avatar } from "@liveblocks/react-ui";
import type { CSSProperties, RefObject } from "react";
import { useLayoutEffect, useState } from "react";
import { resolveDomPoint } from "./dom-selection";

type Rect = { left: number; top: number; width: number; height: number };

type LiveCaret = {
  connectionId: number;
  userInfo: Liveblocks["UserMeta"]["info"];
  caret: Rect;
  highlights: Rect[];
};

// Renders every other user's caret and selection highlight, from presence
export function LiveCarets({
  editorRef,
  text,
}: {
  editorRef: RefObject<HTMLDivElement>;
  text: LiveTextData;
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
    const element = editorRef.current;
    const container = element?.parentElement;
    if (!element || !container) {
      return;
    }

    const containerRect = container.getBoundingClientRect();
    const documentLength = text.reduce(
      (length, [segmentText]) => length + segmentText.length,
      0
    );

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

      const startPoint = resolveDomPoint(element, start);
      const endPoint = resolveDomPoint(element, end);
      const range = document.createRange();
      range.setStart(startPoint.node, startPoint.offset);
      range.setEnd(endPoint.node, endPoint.offset);
      const highlights =
        start === end
          ? []
          : Array.from(range.getClientRects()).map(toLocalRect);

      // The caret sits at the focus, which is before the anchor when selecting backwards
      const focusPoint = resolveDomPoint(element, focus);
      const caretRange = document.createRange();
      caretRange.setStart(focusPoint.node, focusPoint.offset);
      caretRange.collapse(true);
      let caretRect: DOMRect | undefined = caretRange.getClientRects()[0];
      if (!caretRect || caretRect.height === 0) {
        // Collapsed ranges have no rect in some positions; fall back to the first line
        const fallbackRange = document.createRange();
        fallbackRange.selectNodeContents(element);
        caretRect =
          fallbackRange.getClientRects()[0] ??
          fallbackRange.getBoundingClientRect();
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
  }, [others, text, editorRef]);

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
