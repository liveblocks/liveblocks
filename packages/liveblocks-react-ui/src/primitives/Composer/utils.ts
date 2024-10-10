import type { Placement } from "@floating-ui/react-dom";
import {
  type CommentAttachment,
  type CommentBody,
  type CommentBodyLink,
  type CommentBodyMention,
  type CommentLocalAttachment,
  type CommentMixedAttachment,
  HttpError,
  makeEventSource,
  type OpaqueRoom,
} from "@liveblocks/core";
import { useRoom } from "@liveblocks/react";
import type { DragEvent } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useSyncExternalStore } from "use-sync-external-store/shim/index.js";

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
import { getFiles } from "../../utils/data-transfer";
import { exists } from "../../utils/exists";
import { useInitial } from "../../utils/use-initial";
import { useLatest } from "../../utils/use-latest";
import {
  isCommentBodyLink,
  isCommentBodyMention,
  isCommentBodyText,
} from "../Comment/utils";
import { useComposer, useComposerAttachmentsContext } from "./contexts";
import type { SuggestionsPosition } from "./types";

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

export function useComposerAttachmentsDropArea<
  T extends HTMLElement = HTMLElement,
>({
  onDragEnter,
  onDragLeave,
  onDragOver,
  onDrop,
  disabled,
}: {
  onDragEnter?: (event: DragEvent<T>) => void;
  onDragLeave?: (event: DragEvent<T>) => void;
  onDragOver?: (event: DragEvent<T>) => void;
  onDrop?: (event: DragEvent<T>) => void;
  disabled?: boolean;
}) {
  const { isDisabled: isComposerDisabled } = useComposer();
  const isDisabled = isComposerDisabled || disabled;
  const { createAttachments } = useComposerAttachmentsContext();
  const [isDraggingOver, setDraggingOver] = useState(false);
  const latestIsDraggingOver = useLatest(isDraggingOver);

  const handleDragEnter = useCallback(
    (event: DragEvent<T>) => {
      onDragEnter?.(event);

      if (
        latestIsDraggingOver.current ||
        isDisabled ||
        event.isDefaultPrevented()
      ) {
        return;
      }

      const dataTransfer = event.dataTransfer;

      if (!dataTransfer.types.includes("Files")) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();

      setDraggingOver(true);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [onDragEnter, isDisabled]
  );

  const handleDragLeave = useCallback(
    (event: DragEvent<T>) => {
      onDragLeave?.(event);

      if (
        !latestIsDraggingOver.current ||
        isDisabled ||
        event.isDefaultPrevented()
      ) {
        return;
      }

      // Ignore drag leave events that are not actually leaving the drop area
      if (
        event.relatedTarget
          ? event.relatedTarget === event.currentTarget ||
            event.currentTarget.contains(event.relatedTarget as HTMLElement)
          : event.currentTarget !== event.target
      ) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();

      setDraggingOver(false);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [onDragLeave, isDisabled]
  );

  const handleDragOver = useCallback(
    (event: DragEvent<T>) => {
      onDragOver?.(event);

      if (isDisabled || event.isDefaultPrevented()) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
    },
    [onDragOver, isDisabled]
  );

  const handleDrop = useCallback(
    (event: DragEvent<T>) => {
      onDrop?.(event);

      if (
        !latestIsDraggingOver.current ||
        isDisabled ||
        event.isDefaultPrevented()
      ) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();

      setDraggingOver(false);

      const files = getFiles(event.dataTransfer);

      createAttachments(files);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [onDrop, isDisabled, createAttachments]
  );

  return [
    isDraggingOver,
    {
      onDragEnter: handleDragEnter,
      onDragLeave: handleDragLeave,
      onDragOver: handleDragOver,
      onDrop: handleDrop,
      "data-drop": isDraggingOver ? "" : undefined,
      "data-disabled": isDisabled ? "" : undefined,
    } as const,
  ] as const;
}

interface ComposerAttachmentsManagerOptions {
  maxFileSize: number;
}

export class AttachmentTooLargeError extends Error {
  origin: "client" | "server";
  name = "AttachmentTooLargeError";

  constructor(message: string, origin: "client" | "server" = "client") {
    super(message);
    this.origin = origin;
  }
}

function createComposerAttachmentsManager(
  room: OpaqueRoom,
  options: ComposerAttachmentsManagerOptions
) {
  const attachments: Map<string, CommentMixedAttachment> = new Map();
  const abortControllers: Map<string, AbortController> = new Map();
  const eventSource = makeEventSource<void>();
  let cachedSnapshot: CommentMixedAttachment[] | null = null;

  function notifySubscribers() {
    // Invalidate the cached snapshot
    cachedSnapshot = null;
    eventSource.notify();
  }

  function uploadAttachment(attachment: CommentLocalAttachment) {
    const abortController = new AbortController();
    abortControllers.set(attachment.id, abortController);

    room
      .uploadAttachment(attachment, {
        signal: abortController.signal,
      })
      .then(() => {
        attachments.set(attachment.id, {
          ...attachment,
          status: "uploaded",
        });
        notifySubscribers();
      })
      .catch((error) => {
        if (
          error instanceof Error &&
          error.name !== "AbortError" &&
          error.name !== "TimeoutError"
        ) {
          attachments.set(attachment.id, {
            ...attachment,
            status: "error",
            error:
              error instanceof HttpError && error.status === 413
                ? new AttachmentTooLargeError("File is too large.", "server")
                : error,
          });
          notifySubscribers();
        }
      });
  }

  function addAttachments(addedAttachments: CommentMixedAttachment[]) {
    if (addedAttachments.length === 0) {
      return;
    }

    // Ignore attachments that are already in the manager
    const newAttachments = addedAttachments.filter(
      (attachment) => !attachments.has(attachment.id)
    );

    const attachmentsToUpload: CommentLocalAttachment[] = [];

    // Add all the new attachments to the manager
    for (const attachment of newAttachments) {
      if (attachment.type === "localAttachment") {
        // The file is too large to be uploaded
        if (attachment.file.size > options.maxFileSize) {
          attachments.set(attachment.id, {
            ...attachment,
            status: "error",
            error: new AttachmentTooLargeError("File is too large.", "client"),
          });

          continue;
        }

        // Otherwise, mark the attachment to be uploaded
        attachments.set(attachment.id, {
          ...attachment,
          status: "uploading",
        });
        attachmentsToUpload.push(attachment);
      } else {
        attachments.set(attachment.id, attachment);
      }
    }

    // Notify subscribers about the new attachments that were added
    if (newAttachments.length > 0) {
      notifySubscribers();
    }

    // Upload all the new local attachments
    for (const attachment of attachmentsToUpload) {
      uploadAttachment(attachment);
    }
  }

  function removeAttachment(attachmentId: string) {
    const abortController = abortControllers.get(attachmentId);

    abortController?.abort();

    attachments.delete(attachmentId);
    abortControllers.delete(attachmentId);

    notifySubscribers();
  }

  function getSnapshot() {
    if (!cachedSnapshot) {
      cachedSnapshot = Array.from(attachments.values());
    }

    return cachedSnapshot;
  }

  // Clear all attachments and abort all ongoing uploads
  function clear() {
    abortControllers.forEach((controller) => controller.abort());
    abortControllers.clear();
    attachments.clear();

    notifySubscribers();
  }

  return {
    addAttachments,
    removeAttachment,
    getSnapshot,
    subscribe: eventSource.subscribe,
    clear,
  };
}

function preventBeforeUnloadDefault(event: BeforeUnloadEvent) {
  event.preventDefault();
}

export function useComposerAttachmentsManager(
  defaultAttachments: CommentAttachment[],
  options: ComposerAttachmentsManagerOptions
) {
  const room = useRoom();
  const frozenDefaultAttachments = useInitial(defaultAttachments);
  const frozenAttachmentsManager = useInitial(() =>
    createComposerAttachmentsManager(room, options)
  );

  // Initialize default attachments on mount
  useEffect(() => {
    frozenAttachmentsManager.addAttachments(frozenDefaultAttachments);
  }, [frozenDefaultAttachments, frozenAttachmentsManager]);

  // Clear on unmount
  useEffect(() => {
    return () => {
      frozenAttachmentsManager.clear();
    };
  }, [frozenAttachmentsManager]);

  const attachments = useSyncExternalStore(
    frozenAttachmentsManager.subscribe,
    frozenAttachmentsManager.getSnapshot,
    frozenAttachmentsManager.getSnapshot
  );

  const isUploadingAttachments = useMemo(() => {
    return attachments.some(
      (attachment) =>
        attachment.type === "localAttachment" &&
        attachment.status === "uploading"
    );
  }, [attachments]);

  useEffect(() => {
    if (!isUploadingAttachments) {
      return;
    }

    window.addEventListener("beforeunload", preventBeforeUnloadDefault);

    return () => {
      window.removeEventListener("beforeunload", preventBeforeUnloadDefault);
    };
  }, [isUploadingAttachments]);

  return {
    attachments,
    isUploadingAttachments,
    addAttachments: frozenAttachmentsManager.addAttachments,
    removeAttachment: frozenAttachmentsManager.removeAttachment,
    clearAttachments: frozenAttachmentsManager.clear,
  };
}
