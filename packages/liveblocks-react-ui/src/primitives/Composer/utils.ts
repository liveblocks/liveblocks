import type { Placement } from "@floating-ui/react-dom";
import type {
  CommentBody,
  CommentBodyLink,
  CommentBodyMention,
} from "@liveblocks/core";
import type { DragEvent } from "react";
import { useCallback, useState } from "react";

import { isComposerBodyAutoLink } from "../../slate/plugins/auto-links";
import { isComposerBodyCustomLink } from "../../slate/plugins/custom-links";
import { isComposerBodyMention } from "../../slate/plugins/mentions";
import { isText } from "../../slate/utils/is-text";
import type {
  ComposerBody,
  ComposerBodyAutoLink,
  ComposerBodyCustomLink,
  ComposerBodyMention,
  ComposerBodyText,
  Direction,
} from "../../types";
import { exists } from "../../utils/exists";
import {
  isCommentBodyLink,
  isCommentBodyMention,
  isCommentBodyText,
} from "../Comment/utils";
import type {
  ComposerAttachment,
  ComposerLocalAttachment,
  SuggestionsPosition,
} from "./types";

export function composerBodyMentionToCommentBodyMention(
  mention: ComposerBodyMention
): CommentBodyMention {
  return {
    type: "mention",
    id: mention.id,
  };
}

export function composerBodyAutoLinkToCommentBodyLink(
  link: ComposerBodyAutoLink
): CommentBodyLink {
  return {
    type: "link",
    url: link.url,
  };
}

export function composerBodyCustomLinkToCommentBodyLink(
  link: ComposerBodyCustomLink
): CommentBodyLink {
  return {
    type: "link",
    url: link.url,
    text: link.children.map((child) => child.text).join(""),
  };
}

export function commentBodyMentionToComposerBodyMention(
  mention: CommentBodyMention
): ComposerBodyMention {
  return {
    type: "mention",
    id: mention.id,
    children: [{ text: "" }],
  };
}

export function commentBodyLinkToComposerBodyLink(
  link: CommentBodyLink
): ComposerBodyAutoLink | ComposerBodyCustomLink {
  if (link.text) {
    return {
      type: "custom-link",
      url: link.url,
      children: [{ text: link.text }],
    };
  } else {
    return {
      type: "auto-link",
      url: link.url,
      children: [{ text: link.url }],
    };
  }
}

export function composerBodyToCommentBody(body: ComposerBody): CommentBody {
  return {
    version: 1,
    content: body
      .map((block) => {
        // All root blocks are paragraphs at the moment
        if (block.type !== "paragraph") {
          return null;
        }

        const children = block.children
          .map((inline) => {
            if (isComposerBodyMention(inline)) {
              return composerBodyMentionToCommentBodyMention(inline);
            }

            if (isComposerBodyAutoLink(inline)) {
              return composerBodyAutoLinkToCommentBodyLink(inline);
            }

            if (isComposerBodyCustomLink(inline)) {
              return composerBodyCustomLinkToCommentBodyLink(inline);
            }

            if (isText(inline)) {
              return inline;
            }

            return null;
          })
          .filter(exists);

        return {
          ...block,
          children,
        };
      })
      .filter(exists),
  };
}

const emptyComposerBody: ComposerBody = [];

export function commentBodyToComposerBody(body: CommentBody): ComposerBody {
  if (!body || !body?.content) {
    return emptyComposerBody;
  }

  return body.content
    .map((block) => {
      // All root blocks are paragraphs at the moment
      if (block.type !== "paragraph") {
        return null;
      }

      const children = block.children
        .map((inline) => {
          if (isCommentBodyMention(inline)) {
            return commentBodyMentionToComposerBodyMention(inline);
          }

          if (isCommentBodyLink(inline)) {
            return commentBodyLinkToComposerBodyLink(inline);
          }

          if (isCommentBodyText(inline)) {
            return inline as ComposerBodyText;
          }

          return null;
        })
        .filter(exists);

      return {
        ...block,
        children,
      };
    })
    .filter(exists);
}

export function getPlacementFromPosition(
  position: SuggestionsPosition,
  direction: Direction = "ltr"
): Placement {
  return `${position}-${direction === "rtl" ? "end" : "start"}`;
}

export function getSideAndAlignFromPlacement(placement: Placement) {
  const [side, align = "center"] = placement.split("-");

  return [side, align] as const;
}

export function getAcceptedFilesFromFileList(fileList: FileList | null) {
  if (!fileList) {
    return [];
  }

  const files = Array.from(fileList);

  return files.filter((file) => file.type);
}

export function useComposerAttachmentsDropArea<
  T extends HTMLElement = HTMLElement,
>({
  handleFiles,
  onDragEnter,
  onDragLeave,
  onDragOver,
  onDrop,
  ignoreLeaveEvent,
  disabled,
}: {
  handleFiles: (files: File[]) => void;
  onDragEnter?: (event: DragEvent<T>) => void;
  onDragLeave?: (event: DragEvent<T>) => void;
  onDragOver?: (event: DragEvent<T>) => void;
  onDrop?: (event: DragEvent<T>) => void;
  ignoreLeaveEvent?: (event: DragEvent<T>) => boolean;
  disabled?: boolean;
}) {
  const [isDraggingOver, setDraggingOver] = useState(false);

  const handleDragEnter = useCallback(
    (event: DragEvent<T>) => {
      onDragEnter?.(event);

      if (disabled || event.isDefaultPrevented()) {
        return;
      }

      const dataTransfer = event.dataTransfer;

      if (dataTransfer.types.includes("Files")) {
        event.preventDefault();
        event.stopPropagation();

        setDraggingOver(true);
      }
    },
    [onDragEnter, disabled]
  );

  const handleDragLeave = useCallback(
    (event: DragEvent<T>) => {
      onDragLeave?.(event);

      if (disabled || event.isDefaultPrevented()) {
        return;
      }

      if (ignoreLeaveEvent?.(event)) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();

      setDraggingOver(false);
    },
    [onDragLeave, ignoreLeaveEvent, disabled]
  );

  const handleDragOver = useCallback(
    (event: DragEvent<T>) => {
      onDragOver?.(event);

      if (disabled || !isDraggingOver || event.isDefaultPrevented()) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
    },
    [onDragOver, isDraggingOver, disabled]
  );

  const handleDrop = useCallback(
    (event: DragEvent<T>) => {
      onDrop?.(event);

      if (disabled || event.isDefaultPrevented()) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();

      setDraggingOver(false);

      const files = getAcceptedFilesFromFileList(event.dataTransfer.files);

      handleFiles(files);
    },
    [onDrop, handleFiles, disabled]
  );

  return [
    isDraggingOver,
    {
      onDragEnter: handleDragEnter,
      onDragLeave: handleDragLeave,
      onDragOver: handleDragOver,
      onDrop: handleDrop,
      "data-drop": isDraggingOver ? "" : undefined,
    } as const,
  ] as const;
}

export function isComposerLocalAttachment(
  attachment: ComposerAttachment
): attachment is ComposerLocalAttachment {
  return (attachment as ComposerLocalAttachment).file !== undefined;
}
