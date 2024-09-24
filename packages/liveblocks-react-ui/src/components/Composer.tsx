"use client";

import type { BaseMetadata, DM } from "@liveblocks/core";
import { kInternal } from "@liveblocks/core";
import {
  useClient,
  useCreateComment,
  useCreateThread,
  useEditComment,
  useSelf,
} from "@liveblocks/react";
import type {
  ComponentPropsWithoutRef,
  FocusEvent,
  FormEvent,
  ForwardedRef,
  MouseEvent,
  ReactNode,
  RefAttributes,
  SyntheticEvent,
} from "react";
import React, { forwardRef, useCallback, useMemo, useState } from "react";

import { EmojiIcon } from "../icons/Emoji";
import { MentionIcon } from "../icons/Mention";
import { SendIcon } from "../icons/Send";
import type { ComposerOverrides, GlobalOverrides } from "../overrides";
import { useOverrides } from "../overrides";
import * as ComposerPrimitive from "../primitives/Composer";
import { useComposer } from "../primitives/Composer/contexts";
import type {
  ComposerEditorComponents,
  ComposerEditorLinkProps,
  ComposerEditorMentionProps,
  ComposerEditorMentionSuggestionsProps,
  ComposerEditorProps,
  ComposerSubmitComment,
} from "../primitives/Composer/types";
import { MENTION_CHARACTER } from "../slate/plugins/mentions";
import { classNames } from "../utils/class-names";
import { useControllableState } from "../utils/use-controllable-state";
import { Attribution } from "./internal/Attribution";
import { Avatar } from "./internal/Avatar";
import { Button } from "./internal/Button";
import type { EmojiPickerProps } from "./internal/EmojiPicker";
import { EmojiPicker, EmojiPickerTrigger } from "./internal/EmojiPicker";
import {
  ShortcutTooltip,
  ShortcutTooltipKey,
  Tooltip,
  TooltipProvider,
} from "./internal/Tooltip";
import { User } from "./internal/User";

interface EditorActionProps extends ComponentPropsWithoutRef<"button"> {
  label: string;
}

interface EmojiEditorActionProps extends EditorActionProps {
  onPickerOpenChange?: EmojiPickerProps["onOpenChange"];
}

type ComposerCreateThreadProps<M extends BaseMetadata> = {
  threadId?: never;
  commentId?: never;

  /**
   * The metadata of the thread to create.
   */
  metadata?: M;
};

type ComposerCreateCommentProps = {
  /**
   * The ID of the thread to reply to.
   */
  threadId: string;
  commentId?: never;
  metadata?: never;
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
  metadata?: never;
};

export type ComposerProps<M extends BaseMetadata = DM> = Omit<
  ComponentPropsWithoutRef<"form">,
  "defaultValue"
> &
  (
    | ComposerCreateThreadProps<M>
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
    overrides?: Partial<GlobalOverrides & ComposerOverrides>;

    /**
     * @internal
     */
    actions?: ReactNode;

    /**
     * @internal
     */
    showAttribution?: boolean;
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

function ComposerInsertEmojiEditorAction({
  label,
  onPickerOpenChange,
  className,
  ...props
}: EmojiEditorActionProps) {
  const { insertText } = useComposer();

  const preventDefault = useCallback((event: SyntheticEvent) => {
    event.preventDefault();
  }, []);

  const stopPropagation = useCallback((event: SyntheticEvent) => {
    event.stopPropagation();
  }, []);

  return (
    <EmojiPicker onEmojiSelect={insertText} onOpenChange={onPickerOpenChange}>
      <Tooltip content={label}>
        <EmojiPickerTrigger asChild>
          <Button
            className={classNames("lb-composer-editor-action", className)}
            onMouseDown={preventDefault}
            onClick={stopPropagation}
            aria-label={label}
            {...props}
          >
            <EmojiIcon className="lb-button-icon" />
          </Button>
        </EmojiPickerTrigger>
      </Tooltip>
    </EmojiPicker>
  );
}

function ComposerMention({ userId }: ComposerEditorMentionProps) {
  return (
    <ComposerPrimitive.Mention className="lb-composer-mention">
      {MENTION_CHARACTER}
      <User userId={userId} />
    </ComposerPrimitive.Mention>
  );
}

function ComposerMentionSuggestions({
  userIds,
}: ComposerEditorMentionSuggestionsProps) {
  return userIds.length > 0 ? (
    <ComposerPrimitive.Suggestions className="lb-root lb-portal lb-elevation lb-composer-suggestions lb-composer-mention-suggestions">
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

function ComposerLink({ href, children }: ComposerEditorLinkProps) {
  return (
    <ComposerPrimitive.Link href={href} className="lb-composer-link">
      {children}
    </ComposerPrimitive.Link>
  );
}

const editorComponents: ComposerEditorComponents = {
  Mention: ComposerMention,
  MentionSuggestions: ComposerMentionSuggestions,
  Link: ComposerLink,
};

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
      showAttribution,
      onFocus,
      onBlur,
      className,
      ...props
    },
    forwardedRef
  ) => {
    const client = useClient();
    const hasResolveMentionSuggestions =
      client[kInternal].resolveMentionSuggestions !== undefined;
    const self = useSelf();
    const isDisabled = useMemo(
      () => disabled || (self ? !self.canComment : false),
      [disabled, self?.canComment] // eslint-disable-line react-hooks/exhaustive-deps
    );
    const { isEmpty } = useComposer();
    const $ = useOverrides(overrides);
    const [isEmojiPickerOpen, setEmojiPickerOpen] = useState(false);
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

        if (isOutside && isEmpty && !isEmojiPickerOpen) {
          onCollapsedChange?.(true);
        }
      },
      [isEmojiPickerOpen, isEmpty, onBlur, onCollapsedChange]
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
        {/* TODO: Understand why composer won't allow to be focused */}
        <ComposerPrimitive.Editor
          className="lb-composer-editor"
          onClick={handleEditorClick}
          placeholder={$.COMPOSER_PLACEHOLDER}
          defaultValue={defaultValue}
          // disabled={isDisabled}
          disabled={false} // check if relevant
          autoFocus={autoFocus}
          components={editorComponents}
          dir={$.dir}
        />
        {!collapsed && (
          <div className="lb-composer-footer">
            <div className="lb-composer-editor-actions">
              {hasResolveMentionSuggestions && (
                <ComposerInsertMentionEditorAction
                  label={$.COMPOSER_INSERT_MENTION}
                  disabled={false}
                />
              )}
              <ComposerInsertEmojiEditorAction
                label={$.COMPOSER_INSERT_EMOJI}
                onPickerOpenChange={setEmojiPickerOpen}
                disabled={false}
              />
            </div>
            {showAttribution && <Attribution />}
            <div className="lb-composer-actions">
              {actions ?? (
                <>
                  <ShortcutTooltip
                    content={$.COMPOSER_SEND}
                    shortcut={<ShortcutTooltipKey name="enter" />}
                  >
                    <ComposerPrimitive.Submit disabled={false} asChild>
                      <Button
                        onMouseDown={preventDefault}
                        onClick={stopPropagation}
                        className="lb-composer-action"
                        disabled={false}
                        variant="primary"
                        aria-label={$.COMPOSER_SEND}
                      >
                        <SendIcon />
                      </Button>
                    </ComposerPrimitive.Submit>
                  </ShortcutTooltip>
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
export const Composer = forwardRef(
  <M extends BaseMetadata = DM>(
    {
      threadId,
      commentId,
      metadata,
      onComposerSubmit,
      onFocus,
      ...props
    }: ComposerProps<M>,
    forwardedRef: ForwardedRef<HTMLFormElement>
  ) => {
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
            metadata: metadata ?? {},
          });
        }
      },
      [
        commentId,
        createComment,
        createThread,
        editComment,
        metadata,
        onComposerSubmit,
        threadId,
      ]
    );

    return (
      <TooltipProvider>
        <ComposerPrimitive.Form
          onComposerSubmit={handleCommentSubmit}
          onFocus={onFocus}
          asChild
        >
          <ComposerWithContext {...props} ref={forwardedRef} />
        </ComposerPrimitive.Form>
      </TooltipProvider>
    );
  }
) as <M extends BaseMetadata = DM>(
  props: ComposerProps<M> & RefAttributes<HTMLFormElement>
) => JSX.Element;
