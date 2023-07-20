import type { CommentBody } from "@liveblocks/core";
import type { ComponentProps, FormEvent, ReactNode } from "react";
import React, { forwardRef, useCallback } from "react";

import { MentionIcon } from "../icons/mention";
import { SendIcon } from "../icons/send";
import type {
  ComposerEditorProps,
  ComposerFormProps,
  ComposerSubmitComment,
} from "../primitives/Composer";
import { Composer as ComposerPrimitive } from "../primitives/Composer";
import type { SlotProp } from "../types";
import { classNames } from "../utils/class-names";
import { Logo } from "./Logo";

interface ComposerMenuProps extends ComponentProps<"div"> {
  actions: ReactNode;
}

type ComposerCreateThreadProps = {
  threadId?: never;
  commentId?: never;
  metadata?: any; // TODO: How do we type this?
  body?: never;
};

type ComposerCreateCommentProps = {
  threadId: string;
  commentId?: never;
  metadata?: never;
  body?: never;
};

type ComposerEditCommentProps = {
  threadId: string;
  commentId: string;
  metadata?: never;
  body: CommentBody;
};

export type ComposerProps = Omit<ComposerFormProps, keyof SlotProp> &
  Pick<ComposerEditorProps, "initialValue" | "disabled"> &
  (
    | ComposerCreateThreadProps
    | ComposerCreateCommentProps
    | ComposerEditCommentProps
  );

export function ComposerMenu({
  actions,
  className,
  ...props
}: ComposerMenuProps) {
  return (
    <div className={classNames(className, "lb-composer-menu")} {...props}>
      <div className="lb-composer-editor-actions">
        <button
          className="lb-composer-button lb-composer-editor-action"
          aria-label="Insert mention"
        >
          <MentionIcon />
        </button>
      </div>
      <Logo className="lb-composer-logo" />
      <div className="lb-composer-actions">{actions}</div>
    </div>
  );
}

export const Composer = forwardRef<HTMLFormElement, ComposerProps>(
  (
    {
      threadId,
      commentId,
      // metadata,
      // body,
      onCommentSubmit,
      initialValue,
      disabled,
      className,
      ...props
    },
    forwardedRef
  ) => {
    const handleCommentSubmit = useCallback(
      (comment: ComposerSubmitComment, event: FormEvent<HTMLFormElement>) => {
        onCommentSubmit?.(comment, event);

        if (event.isDefaultPrevented()) {
          return;
        }

        if (commentId) {
          // TODO: How do we get the room ID and thread ID here?
          // editComment("TODO", {
          //   commentId: comment.id,
          //   threadId: "TODO",
          //   body,
          // });
        } else if (threadId) {
          // TODO: How do we get the room ID here?
          // createThread("TODO", {
          //   commentId: comment.id,
          //   body,
          //   metadata
          // });
        } else {
          // TODO: How do we get the room ID and thread ID here?
          // createComment("TODO", {
          //   commentId: comment.id,
          //   threadId: "TODO",
          //   body,
          // });
        }
      },
      [commentId, onCommentSubmit, threadId]
    );

    return (
      <ComposerPrimitive.Form
        className={classNames(className, "lb-composer-form")}
        {...props}
        ref={forwardedRef}
        onCommentSubmit={handleCommentSubmit}
      >
        <ComposerPrimitive.Editor
          className="lb-composer-editor"
          initialValue={initialValue}
          placeholder="Write a comment…"
          disabled={disabled}
        />
        <ComposerMenu
          actions={
            <ComposerPrimitive.Submit
              className="lb-composer-button lb-composer-action"
              aria-label="Send"
            >
              <SendIcon />
            </ComposerPrimitive.Submit>
          }
        />
      </ComposerPrimitive.Form>
    );
  }
);
