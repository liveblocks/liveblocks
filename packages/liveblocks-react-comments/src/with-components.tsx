"use client";

import type {
  BaseMetadata,
  BaseUserInfo,
  CommentBody,
  CommentData,
} from "@liveblocks/core";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import type {
  ComponentProps,
  ComponentPropsWithoutRef,
  FormEvent,
  ForwardRefExoticComponent,
  ReactNode,
  RefAttributes,
} from "react";
import React, { forwardRef, useCallback, useMemo, useState } from "react";

import { Comment as DefaultComment } from "./components/Comment";
import type {
  ComposerEditorProps as DefaultComposerEditorProps,
  ComposerFormProps as DefaultComposerFormProps,
  ComposerSubmitComment,
} from "./components/Composer";
import { Composer as DefaultComposer } from "./components/Composer";
import { Logo } from "./components/Logo";
import { Timestamp } from "./components/Timestamp";
import type { CommentsContext } from "./factory";
import { CheckIcon } from "./icons/check";
import { CrossIcon } from "./icons/cross";
import { EllipsisIcon } from "./icons/ellipsis";
import { MentionIcon } from "./icons/mention";
import { SendIcon } from "./icons/send";
import type { SlotProp } from "./types";
import { classNames } from "./utils/class-names";
import { getInitials } from "./utils/get-initials";

export type CommentsContextWithComponents<
  TThreadMetadata extends BaseMetadata,
  TUserInfo extends BaseUserInfo,
> = CommentsContext<TThreadMetadata, TUserInfo> & {
  Comment: ForwardRefExoticComponent<
    CommentProps & RefAttributes<HTMLDivElement>
  >;
  Composer: ForwardRefExoticComponent<
    ComposerProps & RefAttributes<HTMLFormElement>
  >;
};

interface AvatarProps extends ComponentProps<"div"> {
  userId: string;
}

interface NameProps extends ComponentProps<"span"> {
  userId: string;
}

export interface CommentProps extends ComponentPropsWithoutRef<"div"> {
  comment: CommentData;
}

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

type ComposerProps = Omit<DefaultComposerFormProps, keyof SlotProp> &
  Pick<DefaultComposerEditorProps, "initialValue" | "disabled"> &
  (
    | ComposerCreateThreadProps
    | ComposerCreateCommentProps
    | ComposerEditCommentProps
  );

export function withComponents<
  TThreadMetadata extends BaseMetadata,
  TUserInfo extends BaseUserInfo,
>(
  context: CommentsContext<TThreadMetadata, TUserInfo>
): CommentsContextWithComponents<TThreadMetadata, TUserInfo> {
  const {
    suspense: { useUser },
  } = context;

  // TODO: Handle loading and error states
  function Avatar({ userId, className, ...props }: AvatarProps) {
    const { user } = useUser(userId);
    const resolvedUserName = useMemo(() => user?.name, [user]);
    const resolvedUserAvatar = useMemo(() => user?.avatar, [user]);
    const resolvedUserInitials = useMemo(
      () => (resolvedUserName ? getInitials(resolvedUserName) : undefined),
      [resolvedUserName]
    );

    return (
      <div className={classNames(className, "lb-avatar")} {...props}>
        {resolvedUserAvatar && (
          <img
            className="lb-avatar-image"
            src={resolvedUserAvatar}
            alt={resolvedUserName}
          />
        )}
        {resolvedUserInitials && (
          <span className="lb-avatar-placeholder">{resolvedUserInitials}</span>
        )}
      </div>
    );
  }

  // TODO: Handle loading and error states
  function Name({ userId, ...props }: NameProps) {
    const { user } = useUser(userId);
    const resolvedUserName = useMemo(() => user?.name, [user]);

    return <span {...props}>{resolvedUserName}</span>;
  }

  function ComposerMenu({ actions, className, ...props }: ComposerMenuProps) {
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

  // TODO: Add option to align the body with the avatar or the name (adds/removes a class name)
  const Comment = forwardRef<HTMLDivElement, CommentProps>(
    ({ comment, className, ...props }, forwardedRef) => {
      const [isEditing, setEditing] = useState(false);

      const handleEdit = useCallback(() => {
        setEditing(true);
      }, []);

      const handleEditCancel = useCallback(() => {
        setEditing(false);
      }, []);

      const handleEditSubmit = useCallback(
        ({ body }: ComposerSubmitComment) => {
          // TODO: How do we get the room ID and thread ID here?
          // editComment("TODO", {
          //   commentId: comment.id,
          //   threadId: "TODO",
          //   body,
          // });
          console.log(body);
          setEditing(false);
        },
        []
      );

      const handleDelete = useCallback(() => {
        // TODO: How do we get the room ID and thread ID here?
        // deleteComment("TODO", {
        //   commentId: comment.id,
        //   threadId: "TODO",
        // });
      }, []);

      // TODO: Add option to render a `This comment was deleted` placeholder instead
      if (!comment.body) {
        return null;
      }

      return (
        <div
          className={classNames(className, "lb-avatar")}
          {...props}
          ref={forwardedRef}
        >
          <Avatar className="lb-comment-avatar" userId={comment.userId} />
          <Name className="lb-comment-name" userId={comment.userId} />
          <span className="lb-comment-date">
            <Timestamp
              date={comment.createdAt}
              className="lb-comment-date-timestamp"
            />
            {comment.editedAt && (
              <>
                {" "}
                <span className="lb-comment-date-edited">(edited)</span>
              </>
            )}
          </span>
          {!isEditing && (
            <div className="lb-comment-actions">
              {/* TODO: Only show if permissions (for now = own comments) allow edit/delete */}
              <DropdownMenu.Root>
                <DropdownMenu.Trigger
                  className="lb-comment-button lb-comment-action"
                  aria-label="Comment options"
                >
                  <EllipsisIcon />
                </DropdownMenu.Trigger>
                <DropdownMenu.Portal>
                  {/* TODO: Share viewport padding/spacing values with the mentions suggestions inset */}
                  <DropdownMenu.Content className="lb-comment-options">
                    <DropdownMenu.Item
                      className="lb-comment-option"
                      onSelect={handleEdit}
                    >
                      Edit
                    </DropdownMenu.Item>
                    <DropdownMenu.Item
                      className="lb-comment-option"
                      onSelect={handleDelete}
                    >
                      Delete
                    </DropdownMenu.Item>
                  </DropdownMenu.Content>
                </DropdownMenu.Portal>
              </DropdownMenu.Root>
            </div>
          )}
          {isEditing ? (
            <DefaultComposer.Form
              className="lb-composer-form lb-comment-composer"
              onCommentSubmit={handleEditSubmit}
            >
              <DefaultComposer.Editor
                className="lb-composer-editor"
                placeholder="Edit comment…"
                initialValue={comment.body}
              />
              <ComposerMenu
                actions={
                  <>
                    <button
                      className="lb-composer-button lb-composer-action"
                      aria-label="Cancel"
                      onClick={handleEditCancel}
                    >
                      <CrossIcon />
                    </button>
                    <DefaultComposer.Submit
                      className="lb-composer-button lb-composer-action"
                      aria-label="Save"
                    >
                      <CheckIcon />
                    </DefaultComposer.Submit>
                  </>
                }
              />
            </DefaultComposer.Form>
          ) : (
            <DefaultComment.Body
              className="lb-comment-body"
              body={comment.body}
            />
          )}
        </div>
      );
    }
  );

  const Composer = forwardRef<HTMLFormElement, ComposerProps>(
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
        <DefaultComposer.Form
          className={classNames(className, "lb-composer-form")}
          {...props}
          ref={forwardedRef}
          onCommentSubmit={handleCommentSubmit}
        >
          <DefaultComposer.Editor
            className="lb-composer-editor"
            initialValue={initialValue}
            placeholder="Write a comment…"
            disabled={disabled}
          />
          <ComposerMenu
            actions={
              <DefaultComposer.Submit
                className="lb-composer-button lb-composer-action"
                aria-label="Send"
              >
                <SendIcon />
              </DefaultComposer.Submit>
            }
          />
        </DefaultComposer.Form>
      );
    }
  );

  return {
    ...context,
    Comment,
    Composer,
  };
}
