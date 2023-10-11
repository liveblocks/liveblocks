"use client";

import { CSSProperties, useCallback, useState } from "react";
import sanitizeHtml from "sanitize-html";
import ContentEditable, { ContentEditableEvent } from "react-contenteditable";
import {
  useBroadcastEvent,
  useEventListener,
  useOthers,
  useUpdateMyPresence,
} from "@/liveblocks.config";
import styles from "./EditableTextClient.module.css";
import { shallow } from "@liveblocks/core";
import { ClientSideSuspense } from "@liveblocks/react";

// Toggle real-time text updates
const UPDATE_TEXT_ON_EVERY_KEYPRESS = false;

type Props = {
  strapiApiId: string;
  attribute: string;
  initial: string;
  onUpdate: (text: string) => Promise<boolean>;
  onRevalidate: () => Promise<string>;
};

// Show initial server value whilst Liveblocks connects
export function EditableTextClient(props: Props) {
  return (
    <ClientSideSuspense
      fallback={
        <span data-strapi-editable={`${props.strapiApiId}/${props.attribute}`}>
          <span data-editable>{props.initial}</span>
        </span>
      }
    >
      {() => <LiveblocksEditableText {...props} />}
    </ClientSideSuspense>
  );
}

function LiveblocksEditableText({
  strapiApiId,
  attribute,
  initial,
  onUpdate,
  onRevalidate,
}: Props) {
  const broadcast = useBroadcastEvent();
  const [text, setText] = useState(initial);

  // Sanitize and update text on changes
  const onContentChange = useCallback(
    (e: ContentEditableEvent) => {
      const sanitizeConf = {
        allowedTags: ["b", "i", "a", "p"],
        allowedAttributes: { a: ["href"] },
      };

      const newText = sanitizeHtml(e.currentTarget.innerHTML, sanitizeConf);
      setText(newText);

      if (UPDATE_TEXT_ON_EVERY_KEYPRESS) {
        broadcast({
          type: "editableTextUpdate",
          strapiApiId,
          attribute,
          newText,
        });
      }
    },
    [broadcast, strapiApiId, attribute]
  );

  // On save, send data to server component above
  const updateAttribute = useCallback(async () => {
    const result = await onUpdate(text);

    // If it goes wrong, revalidate
    if (!result) {
      await onRevalidate();
      return;
    }

    // After save, broadcast update event to other Liveblocks users
    broadcast({
      type: "editableTextUpdate",
      strapiApiId,
      attribute,
      newText: text,
    });
  }, [broadcast, strapiApiId, attribute, text, onUpdate, onRevalidate]);

  // Listen for update events for this EditableText component
  useEventListener(async ({ event }) => {
    if (event.type !== "editableTextUpdate") {
      return;
    }

    if (event.strapiApiId === strapiApiId && event.attribute === attribute) {
      if (UPDATE_TEXT_ON_EVERY_KEYPRESS) {
        // Set text immediately from event
        setText(event.newText);
      } else {
        // Update text from Strapi
        const newText = await onRevalidate();
        setText(newText);
      }
    }
  });

  const [focused, setFocused] = useState(false);
  const updateMyPresence = useUpdateMyPresence();

  // Show button on focus and tell others you're updating it
  const handleFocus = useCallback(() => {
    setFocused(true);
    updateMyPresence({ editingText: `${strapiApiId}/${attribute}` });
  }, [updateMyPresence, strapiApiId, attribute]);

  // On blur, hide button and reset your presence
  const handleBlur = useCallback(() => {
    updateMyPresence({ editingText: null });

    // Timeout so button briefly stays clickable
    setTimeout(() => {
      setFocused(false);
    }, 50);
  }, [updateMyPresence]);

  // Find other users that are currently editing this
  const othersEditing = useOthers(
    (others) =>
      others.filter(
        (other) => other.presence.editingText === `${strapiApiId}/${attribute}`
      ),
    shallow
  );

  return (
    <span
      className={styles.EditableTextClient}
      data-strapi-editable={`${strapiApiId}/${attribute}`}
      data-others-editing={othersEditing.length ? true : undefined}
      style={
        {
          "--others-editing-color": othersEditing.length
            ? othersEditing[0].info.color
            : undefined,
        } as CSSProperties
      }
    >
      <ContentEditable
        tagName="span"
        style={{ display: "block " }}
        onChange={onContentChange}
        html={text}
        data-editable
        onFocus={handleFocus}
        onBlur={handleBlur}
      />
      {focused ? (
        <button className={styles.SaveButton} onPointerDown={updateAttribute}>
          Save
        </button>
      ) : null}
      {othersEditing.length ? (
        <span className={styles.OthersEditing}>
          {othersEditing.map((other) => (
            <span
              key={other.connectionId}
              className={styles.OtherEditing}
              style={
                { "--other-editing-color": other.info.color } as CSSProperties
              }
            >
              {other.info.name}
            </span>
          ))}
        </span>
      ) : null}
    </span>
  );
}
