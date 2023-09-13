"use client";

import { useRoomContextBundle } from "@liveblocks/react";
import type {
  ComponentPropsWithoutRef,
  FocusEvent,
  FormEvent,
  MouseEvent,
  ReactNode,
  SyntheticEvent,
} from "react";
import React, { forwardRef, useCallback } from "react";

import { MentionIcon } from "../icons/mention";
import { SendIcon } from "../icons/send";
import { type ComposerOverrides, useOverrides } from "../overrides";
import * as ComposerPrimitive from "../primitives/Composer";
import { useComposer } from "../primitives/Composer/contexts";
import type {
  ComposerEditorProps,
  ComposerRenderLinkProps,
  ComposerRenderMentionProps,
  ComposerRenderMentionSuggestionsProps,
  ComposerSubmitComment,
} from "../primitives/Composer/types";
import { MENTION_CHARACTER } from "../slate/plugins/mentions";
import { classNames } from "../utils/class-names";
import { useControllableState } from "../utils/use-controllable-state";
import { Avatar } from "./internal/Avatar";
import { Button } from "./internal/Button";
import { Logo } from "./internal/Logo";
import {
  Tooltip,
  TooltipProvider,
  TooltipShortcutKey,
} from "./internal/Tooltip";
import { User } from "./internal/User";
import { toAbsoluteURL } from "../primitives/Comment/utils";

interface EditorActionProps extends ComponentPropsWithoutRef<"button"> {
  label: string;
}

type ComposerCreateThreadProps = {
  threadId?: never;
  commentId?: never;
};

type ComposerCreateCommentProps = {
  /**
   * The ID of the thread to reply to.
   */
  threadId: string;
  commentId?: never;
};

type ComposerEditCommentProps = {
  /**
   * The ID of the thread to edit a comment in.
   */
  threadId: string;

  /**
   * The ID of the comment to edit.
   */
  commentId: string;
};

export type ComposerProps = Omit<
  ComponentPropsWithoutRef<"form">,
  "defaultValue"
> &
  (
    | ComposerCreateThreadProps
    | ComposerCreateCommentProps
    | ComposerEditCommentProps
  ) & {
    /**
     * The event handler called when the composer is submitted.
     */
    onComposerSubmit?: (
      comment: ComposerSubmitComment,
      event: FormEvent<HTMLFormElement>
    ) => Promise<void> | void;

    /**
     * The composer's initial value.
     */
    defaultValue?: ComposerEditorProps["defaultValue"];

    /**
     * Whether the composer is collapsed. Setting a value will make the composer controlled.
     */
    collapsed?: boolean;

    /**
     * The event handler called when the collapsed state of the composer changes.
     */
    onCollapsedChange?: (collapsed: boolean) => void;

    /**
     * Whether the composer is initially collapsed. Setting a value will make the composer uncontrolled.
     */
    defaultCollapsed?: boolean;

    /**
     * Whether the composer is disabled.
     */
    disabled?: ComposerEditorProps["disabled"];

    /**
     * Whether to focus the composer on mount.
     */
    autoFocus?: ComposerEditorProps["autoFocus"];

    /**
     * Override the component's strings.
     */
    overrides?: Partial<ComposerOverrides>;

    /**
     * @internal
     */
    actions?: ReactNode;

    /**
     * @internal
     */
    showLogo?: boolean;
  };

function ComposerInsertMentionEditorAction({
  label,
  className,
  onClick,
  ...props
}: EditorActionProps) {
  const { createMention } = useComposer();

  const preventDefault = useCallback((event: SyntheticEvent) => {
    event.preventDefault();
  }, []);

  const handleClick = useCallback(
    (event: MouseEvent<HTMLButtonElement>) => {
      onClick?.(event);

      if (!event.isDefaultPrevented()) {
        event.stopPropagation();
        createMention();
      }
    },
    [createMention, onClick]
  );

  return (
    <Tooltip content={label}>
      <Button
        type="button"
        className={classNames("lb-composer-editor-action", className)}
        onMouseDown={preventDefault}
        onClick={handleClick}
        aria-label={label}
        {...props}
      >
        <MentionIcon className="lb-button-icon" />
      </Button>
    </Tooltip>
  );
}

function ComposerMention({ userId }: ComposerRenderMentionProps) {
  return (
    <ComposerPrimitive.Mention className="lb-composer-mention">
      {MENTION_CHARACTER}
      <User userId={userId} />
    </ComposerPrimitive.Mention>
  );
}

function ComposerMentionSuggestions({
  userIds,
}: ComposerRenderMentionSuggestionsProps) {
  return userIds.length > 0 ? (
    <ComposerPrimitive.Suggestions className="lb-root lb-elevation lb-composer-suggestions lb-composer-mention-suggestions">
      <ComposerPrimitive.SuggestionsList className="lb-composer-suggestions-list lb-composer-mention-suggestions-list">
        {userIds.map((userId) => (
          <ComposerPrimitive.SuggestionsListItem
            key={userId}
            className="lb-composer-suggestions-list-item lb-composer-mention-suggestion"
            value={userId}
          >
            <Avatar
              userId={userId}
              className="lb-composer-mention-suggestion-avatar"
            />
            <User
              userId={userId}
              className="lb-composer-mention-suggestion-user"
            />
          </ComposerPrimitive.SuggestionsListItem>
        ))}
      </ComposerPrimitive.SuggestionsList>
    </ComposerPrimitive.Suggestions>
  ) : null;
}

function ComposerLink({ url, children }: ComposerRenderLinkProps) {
  const href = toAbsoluteURL(url);

  return (
    <ComposerPrimitive.Link
      href={href}
      target="_blank"
      rel="noopener noreferrer nofollow"
      className="lb-composer-link"
    >
      {children}
    </ComposerPrimitive.Link>
  );
}

const ComposerWithContext = forwardRef<
  HTMLFormElement,
  Omit<ComposerProps, "threadId" | "commentId" | "onComposerSubmit">
>(
  (
    {
      defaultValue,
      disabled,
      autoFocus,
      collapsed: controlledCollapsed,
      defaultCollapsed,
      onCollapsedChange: controlledOnCollapsedChange,
      actions,
      overrides,
      showLogo,
      onFocus,
      onBlur,
      className,
      ...props
    },
    forwardedRef
  ) => {
    const { hasResolveMentionSuggestions } = useRoomContextBundle();
    const { isEmpty } = useComposer();
    const $ = useOverrides(overrides);
    const [collapsed, onCollapsedChange] = useControllableState(
      // If the composer is neither controlled nor uncontrolled, it defaults to controlled as uncollapsed.
      controlledCollapsed === undefined && defaultCollapsed === undefined
        ? false
        : controlledCollapsed,
      controlledOnCollapsedChange,
      defaultCollapsed
    );

    const preventDefault = useCallback((event: SyntheticEvent) => {
      event.preventDefault();
    }, []);

    const stopPropagation = useCallback((event: SyntheticEvent) => {
      event.stopPropagation();
    }, []);

    const handleEditorClick = useCallback(
      (event: MouseEvent<HTMLDivElement>) => {
        event.stopPropagation();

        if (isEmpty) {
          onCollapsedChange?.(false);
        }
      },
      [isEmpty, onCollapsedChange]
    );

    const handleFocus = useCallback(
      (event: FocusEvent<HTMLFormElement>) => {
        onFocus?.(event);

        if (event.isDefaultPrevented()) {
          return;
        }

        if (isEmpty) {
          onCollapsedChange?.(false);
        }
      },
      [isEmpty, onCollapsedChange, onFocus]
    );

    const handleBlur = useCallback(
      (event: FocusEvent<HTMLFormElement>) => {
        onBlur?.(event);

        if (event.isDefaultPrevented()) {
          return;
        }

        const isOutside = !event.currentTarget.contains(event.relatedTarget);

        if (isOutside && isEmpty) {
          onCollapsedChange?.(true);
        }
      },
      [isEmpty, onBlur, onCollapsedChange]
    );

    return (
      <form
        className={classNames(
          "lb-root lb-composer lb-composer-form",
          className
        )}
        dir={$.dir}
        {...props}
        ref={forwardedRef}
        data-collapsed={collapsed ? "" : undefined}
        onFocus={handleFocus}
        onBlur={handleBlur}
      >
        <ComposerPrimitive.Editor
          className="lb-composer-editor"
          onClick={handleEditorClick}
          placeholder={$.COMPOSER_PLACEHOLDER}
          defaultValue={defaultValue}
          disabled={disabled}
          autoFocus={autoFocus}
          renderMention={ComposerMention}
          renderMentionSuggestions={ComposerMentionSuggestions}
          renderLink={ComposerLink}
          dir={$.dir}
        />
        {!collapsed && (
          <div className="lb-composer-footer">
            <div className="lb-composer-editor-actions">
              {hasResolveMentionSuggestions && (
                <ComposerInsertMentionEditorAction
                  label={$.COMPOSER_INSERT_MENTION}
                />
              )}
            </div>
            {showLogo && <Logo className="lb-composer-logo" />}
            <div className="lb-composer-actions">
              {actions ?? (
                <>
                  <Tooltip
                    content={$.COMPOSER_SEND}
                    shortcut={<TooltipShortcutKey name="enter" />}
                  >
                    <ComposerPrimitive.Submit disabled={disabled} asChild>
                      <Button
                        onMouseDown={preventDefault}
                        onClick={stopPropagation}
                        className="lb-composer-action"
                        variant="primary"
                        aria-label={$.COMPOSER_SEND}
                      >
                        <SendIcon />
                      </Button>
                    </ComposerPrimitive.Submit>
                  </Tooltip>
                </>
              )}
            </div>
          </div>
        )}
      </form>
    );
  }
);

/**
 * Displays a composer to create comments.
 *
 * @example
 * <Composer />
 */
export const Composer = forwardRef<HTMLFormElement, ComposerProps>(
  ({ threadId, commentId, onComposerSubmit, ...props }, forwardedRef) => {
    const { useCreateThread, useCreateComment, useEditComment } =
      useRoomContextBundle();
    const createThread = useCreateThread();
    const createComment = useCreateComment();
    const editComment = useEditComment();

    const handleCommentSubmit = useCallback(
      (comment: ComposerSubmitComment, event: FormEvent<HTMLFormElement>) => {
        onComposerSubmit?.(comment, event);

        if (event.isDefaultPrevented()) {
          return;
        }

        if (commentId && threadId) {
          editComment({
            commentId,
            threadId,
            body: comment.body,
          });
        } else if (threadId) {
          createComment({
            threadId,
            body: comment.body,
          });
        } else {
          createThread({
            body: comment.body,
            metadata: {},
          });
        }
      },
      [
        commentId,
        createComment,
        createThread,
        editComment,
        onComposerSubmit,
        threadId,
      ]
    );

    return (
      <TooltipProvider>
        <ComposerPrimitive.Form onComposerSubmit={handleCommentSubmit} asChild>
          <ComposerWithContext {...props} ref={forwardedRef} />
        </ComposerPrimitive.Form>
      </TooltipProvider>
    );
  }
);
