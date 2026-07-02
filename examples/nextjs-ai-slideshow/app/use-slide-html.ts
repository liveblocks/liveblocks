"use client";

import { useEffect, useState } from "react";
import { useRoom } from "@liveblocks/react/suspense";
import { getYjsProviderForRoom } from "@liveblocks/yjs";
import { STARTER_SLIDE_HTML } from "./slide-html";

export function useSlideHtml() {
  const room = useRoom();
  const [html, setHtml] = useState(STARTER_SLIDE_HTML);

  useEffect(() => {
    const provider = getYjsProviderForRoom(room);
    const ydoc = provider.getYDoc();
    const ytext = ydoc.getText("codemirror");

    const updateHtml = () => {
      const value = ytext.toString();
      setHtml(value || STARTER_SLIDE_HTML);
    };

    updateHtml();
    ytext.observe(updateHtml);

    return () => {
      ytext.unobserve(updateHtml);
    };
  }, [room]);

  return html;
}
