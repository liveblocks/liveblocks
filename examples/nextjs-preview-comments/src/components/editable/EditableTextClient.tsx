"use client";

import { useCallback, useState } from "react";
import sanitizeHtml from "sanitize-html";
import ContentEditable, { ContentEditableEvent } from "react-contenteditable";
import { useBroadcastEvent, useEventListener } from "@/liveblocks.config";

type Props = {
  strapiApiId: string;
  attribute: string;
  initial: string;
  onUpdate: (text: string) => Promise<boolean>;
  onRevalidate: () => Promise<string>;
};

export function EditableTextClient({
  strapiApiId,
  attribute,
  initial,
  onUpdate,
  onRevalidate,
}: Props) {
  const [text, setText] = useState(initial);
  const broadcast = useBroadcastEvent();

  const onContentChange = useCallback((e: ContentEditableEvent) => {
    const sanitizeConf = {
      allowedTags: ["b", "i", "a", "p"],
      allowedAttributes: { a: ["href"] },
    };

    setText(sanitizeHtml(e.currentTarget.innerHTML, sanitizeConf));
  }, []);

  // On save, send data to server component above
  const updateAttribute = useCallback(async () => {
    const result = await onUpdate(text);

    if (!result) {
      return;
    }

    // After save, broadcast update event to other Liveblocks users
    broadcast({
      type: "editableTextUpdate",
      strapiApiId,
      attribute,
      newText: text,
    });
  }, [broadcast, strapiApiId, attribute, text, onUpdate]);

  // Listen for update events for this EditableText component
  useEventListener(async ({ event }) => {
    if (event.type !== "editableTextUpdate") {
      return;
    }

    if (event.strapiApiId === strapiApiId && event.attribute === attribute) {
      // Set text immediately from event to save 1 second
      // setText(event.newText);

      // Update text from Strapi just to be sure
      const newText = await onRevalidate();
      setText(newText);
    }
  });

  return (
    <div style={{ display: "flex", justifyContent: "space-between" }}>
      <ContentEditable onChange={onContentChange} html={text} />
      <button onClick={updateAttribute}>Save</button>
    </div>
  );
}
