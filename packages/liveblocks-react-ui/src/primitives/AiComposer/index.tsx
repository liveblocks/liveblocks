import {
  type AiChatMessage,
  kInternal,
  Signal,
  type WithNavigation,
} from "@liveblocks/core";
import { useClient } from "@liveblocks/react";
import { useLayoutEffect, useSignal } from "@liveblocks/react/_private";
import { Slot } from "@radix-ui/react-slot";
import type { FocusEvent, FormEvent, KeyboardEvent, MouseEvent } from "react";
import {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  createEditor,
  Editor as SlateEditor,
  Transforms as SlateTransforms,
} from "slate";
import { withHistory } from "slate-history";
import {
  Editable,
  ReactEditor,
  type RenderPlaceholderProps,
  Slate,
  withReact,
} from "slate-react";

import type { AiComposerBody } from "../../types";
import { requestSubmit } from "../../utils/request-submit";
import { useInitial } from "../../utils/use-initial";
import { withNormalize } from "../slate/plugins/normalize";
import { getDOMRange } from "../slate/utils/get-dom-range";
import { isEmpty } from "../slate/utils/is-empty";
import {
  AiComposerContext,
  AiComposerEditorContext,
  useAiComposer,
  useAiComposerEditorContext,
} from "./contexts";
import type {
  AiComposerEditorProps,
  AiComposerFormProps,
  AiComposerSubmitProps,
} from "./types";

const AI_COMPOSER_SUBMIT_NAME = "AiComposerSubmit";
const AI_COMPOSER_ABORT_NAME = "AiComposerAbort";
const AI_COMPOSER_EDITOR_NAME = "AiComposerEditor";
const AI_COMPOSER_FORM_NAME = "AiComposerForm";

type UiChatMessage = WithNavigation<AiChatMessage>;

/* -------------------------------------------------------------------------------------------------
 * Form
 * -----------------------------------------------------------------------------------------------*/

const emptyMessagesΣ = new Signal<UiChatMessage[]>([]);

function getLastMessageId(messages: UiChatMessage[]) {
  const lastMessage = messages[messages.length - 1];

  if (lastMessage === undefined) {
    return null;
  }

  return lastMessage.id;
}

function getAbortableMessageId(messages: UiChatMessage[]) {
  return messages.find(
    (message) =>
      message.role === "assistant" &&
      (message.status === "generating" || message.status === "awaiting-tool")
  )?.id;
}

/**
 * Surrounds the AI composer's content and handles submissions.
 *
 * @example
 * <AiComposer.Form onComposerSubmit={({ text }) => {}}>
 *	 <AiComposer.Editor />
 *   <AiComposer.Submit />
 * </AiComposer.Form>
 */
export const AiComposerForm = forwardRef<HTMLFormElement, AiComposerFormProps>(
  (
    {
      onComposerSubmit,
      onSubmit,
      disabled,
      chatId,
      branchId,
      asChild,
      ...props
    },
    forwardedRef
  ) => {
    const Component = asChild ? Slot : "form";
    const client = useClient();
    const formRef = useRef<HTMLFormElement | null>(null);
    const editor = useInitial(() =>
      withNormalize(withHistory(withReact(createEditor())))
    );
    const [isEditorEmpty, setEditorEmpty] = useState(true);
    const [isSubmitting, setSubmitting] = useState(false);
    const [isFocused, setFocused] = useState(false);
    const messagesΣ = chatId
      ? client[kInternal].ai.signals.getChatMessagesForBranchΣ(chatId, branchId)
      : emptyMessagesΣ;
    const lastMessageId = useSignal(messagesΣ, getLastMessageId);
    const abortableMessageId = useSignal(messagesΣ, getAbortableMessageId);
    const isAvailable = useSignal(
      // Subscribe to connection status signal
      client[kInternal].ai.signals.statusΣ,
      // "Disconnected" means the AI service is not available
      // as it represents a final error status.
      (status) => status !== "disconnected"
    );

    const isDisabled = isSubmitting || disabled === true;

    const canAbort = isAvailable && abortableMessageId !== undefined;
    const canSubmit = isAvailable && !isEditorEmpty && !canAbort;

    const clear = useCallback(() => {
      SlateTransforms.delete(editor, {
        at: {
          anchor: SlateEditor.start(editor, []),
          focus: SlateEditor.end(editor, []),
        },
      });
    }, [editor]);

    const select = useCallback(() => {
      SlateTransforms.select(editor, SlateEditor.end(editor, []));
    }, [editor]);

    const focus = useCallback(
      (resetSelection = true) => {
        try {
          // Slate's `ReactEditor.focus` method can use `setTimeout` internally
          // which prevents us from catching errors, so this is a reimplementation.
          // https://github.com/ianstormtaylor/slate/blob/main/packages/slate-dom/src/plugin/dom-editor.ts
          if (!ReactEditor.isFocused(editor)) {
            SlateTransforms.select(
              editor,
              resetSelection || !editor.selection
                ? SlateEditor.end(editor, [])
                : editor.selection
            );

            const element = ReactEditor.toDOMNode(editor, editor);

            if (editor.selection) {
              const domSelection = window.getSelection();
              const domRange = getDOMRange(editor, editor.selection);

              if (domRange) {
                domSelection?.removeAllRanges();
                domSelection?.addRange(domRange);
              }
            }

            element.focus({ preventScroll: true });
          }
        } catch {
          // Slate's DOM-specific methods will throw if the editor's DOM
          // node no longer exists. This action doesn't make sense on an
          // unmounted editor so we can safely ignore it.
        }
      },
      [editor]
    );

    const blur = useCallback(() => {
      try {
        ReactEditor.blur(editor);
      } catch {
        // Slate's DOM-specific methods will throw if the editor's DOM
        // node no longer exists. This action doesn't make sense on an
        // unmounted editor so we can safely ignore it.
      }
    }, [editor]);

    const onSubmitEnd = useCallback(() => {
      clear();
      setSubmitting(false);
    }, [clear]);

    const handleSubmit = useCallback(
      (event: FormEvent<HTMLFormElement>) => {
        if (disabled) {
          return;
        }

        // In some situations (e.g. pressing Enter while composing diacritics), it's possible
        // for the form to be submitted as empty even though we already checked whether the
        // editor was empty when handling the key press.
        const isEditorEmpty = isEmpty(editor, editor.children);

        // We even prevent the user's `onSubmit` handler from being called if the editor is empty.
        if (isEditorEmpty) {
          event.preventDefault();

          return;
        }

        onSubmit?.(event);

        if (onComposerSubmit === undefined || event.isDefaultPrevented()) {
          event.preventDefault();
          return;
        }

        // Extract the text content from the editor.
        const content = editor.children
          .map((block) => {
            if ("type" in block && block.type === "paragraph") {
              return block.children
                .map((child) => {
                  if ("text" in child) {
                    return child.text;
                  }
                  return "";
                })
                .join("");
            }
            return "";
          })
          .join("\n");

        const promise = onComposerSubmit(
          { text: content, lastMessageId },
          event
        );

        event.preventDefault();

        if (promise) {
          setSubmitting(true);
          promise.then(onSubmitEnd);
        } else {
          onSubmitEnd();
        }
      },
      [disabled, editor, onSubmit, onComposerSubmit, onSubmitEnd, lastMessageId]
    );

    useLayoutEffect(() => {
      setEditorEmpty(isEmpty(editor, editor.children));
    }, [editor]);

    const handleEditorValueChange = useCallback(() => {
      setEditorEmpty(isEmpty(editor, editor.children));
    }, [editor]);

    const submit = useCallback(() => {
      if (!canSubmit) {
        return;
      }

      // We need to wait for the next frame in some cases like when composing diacritics,
      // we want any native handling to be done first while still being handled on `keydown`.
      requestAnimationFrame(() => {
        if (formRef.current) {
          requestSubmit(formRef.current);
        }
      });
    }, [canSubmit]);

    const abort = useCallback(() => {
      if (!canAbort || !abortableMessageId) {
        return;
      }

      client[kInternal].ai.abort(abortableMessageId);
    }, [canAbort, abortableMessageId, client]);

    useImperativeHandle<HTMLFormElement | null, HTMLFormElement | null>(
      forwardedRef,
      () => formRef.current,
      []
    );

    return (
      <AiComposerEditorContext.Provider
        value={{
          editor,
          onEditorValueChange: handleEditorValueChange,
          abortableMessageId,
          setFocused,
        }}
      >
        <AiComposerContext.Provider
          value={{
            isDisabled,
            isEmpty: isEditorEmpty,
            isFocused,
            canSubmit,
            canAbort,
            submit,
            abort,
            clear,
            focus,
            blur,
            select,
          }}
        >
          <Component onSubmit={handleSubmit} {...props} ref={formRef} />
        </AiComposerContext.Provider>
      </AiComposerEditorContext.Provider>
    );
  }
);

/* -------------------------------------------------------------------------------------------------
 * Editor
 * -----------------------------------------------------------------------------------------------*/

function AiComposerEditorPlaceholder({
  attributes,
  children,
}: RenderPlaceholderProps) {
  const { opacity: _opacity, ...style } = attributes.style;

  return (
    <span {...attributes} style={style} data-placeholder="">
      {children}
    </span>
  );
}

/**
 * Displays the AI composer's editor.
 *
 * @example
 * <AiComposer.Editor placeholder="Write a message…" />
 */
const AiComposerEditor = forwardRef<HTMLDivElement, AiComposerEditorProps>(
  (
    {
      defaultValue = "",
      onKeyDown,
      onFocus,
      onBlur,
      disabled,
      autoFocus,
      dir,
      ...props
    },
    forwardedRef
  ) => {
    const { editor, onEditorValueChange, setFocused } =
      useAiComposerEditorContext();
    const {
      submit,
      isDisabled: isComposerDisabled,
      isFocused,
      focus,
      blur,
      select,
    } = useAiComposer();
    const isDisabled = disabled || isComposerDisabled;

    const handleKeyDown = useCallback(
      (event: KeyboardEvent<HTMLDivElement>) => {
        onKeyDown?.(event);
        if (event.isDefaultPrevented()) return;

        if (event.key === "Enter" && !event.shiftKey) {
          event.preventDefault();
          submit();
        } else if (event.key === "Enter" && event.shiftKey) {
          event.preventDefault();
          editor.insertBreak();
        } else if (event.key === "Escape") {
          blur();
        }
      },
      [editor, onKeyDown, submit, blur]
    );

    const handleFocus = useCallback(
      (event: FocusEvent<HTMLDivElement>) => {
        onFocus?.(event);

        if (!event.isDefaultPrevented()) {
          setFocused(true);
        }
      },
      [onFocus, setFocused]
    );

    const handleBlur = useCallback(
      (event: FocusEvent<HTMLDivElement>) => {
        onBlur?.(event);

        if (!event.isDefaultPrevented()) {
          setFocused(false);
        }
      },
      [onBlur, setFocused]
    );

    useImperativeHandle(
      forwardedRef,
      () => ReactEditor.toDOMNode(editor, editor) as HTMLDivElement,
      [editor]
    );

    // Manually focus the editor when `autoFocus` is true
    useLayoutEffect(() => {
      if (!autoFocus) {
        return;
      }

      // `focus` needs to be synchronous to ensure its errors can be caught
      // but the triggering of `focus` on mount itself can be asynchronous.
      // This brings back the same timing behavior as Slate's `ReactEditor.focus`
      // (which uses `setTimeout` internally) while still allowing us to catch errors.
      const timeout = setTimeout(() => focus(), 0);

      return () => clearTimeout(timeout);
    }, [autoFocus, editor, focus]);

    // Manually add a selection in the editor if the selection
    // is still empty after being focused
    useLayoutEffect(() => {
      if (isFocused && editor.selection === null) {
        select();
      }
    }, [editor, select, isFocused]);

    const initialValue: AiComposerBody = useMemo(() => {
      return defaultValue
        .split("\n")
        .map((text) => ({ type: "paragraph", children: [{ text }] }));
    }, [defaultValue]);

    return (
      <Slate
        editor={editor}
        initialValue={initialValue}
        onValueChange={onEditorValueChange}
      >
        <Editable
          dir={dir}
          enterKeyHint="send"
          autoCapitalize="sentences"
          aria-label="Composer editor"
          onKeyDown={handleKeyDown}
          onFocus={handleFocus}
          onBlur={handleBlur}
          data-focused={isFocused || undefined}
          data-disabled={isDisabled || undefined}
          {...props}
          readOnly={isDisabled}
          disabled={isDisabled}
          renderPlaceholder={AiComposerEditorPlaceholder}
        />
      </Slate>
    );
  }
);

/* -------------------------------------------------------------------------------------------------
 * Submit
 * -----------------------------------------------------------------------------------------------*/

/**
 * A button to submit the AI composer's content.
 *
 * @example
 * <AiComposer.Submit>Send</AiComposer.Submit>
 */
export const AiComposerSubmit = forwardRef<
  HTMLButtonElement,
  AiComposerSubmitProps
>(({ disabled, asChild, ...props }, forwardedRef) => {
  const Component = asChild ? Slot : "button";
  const { isDisabled: isComposerDisabled, canSubmit } = useAiComposer();
  const isDisabled = isComposerDisabled || disabled || !canSubmit;

  return (
    <Component
      type="submit"
      {...props}
      ref={forwardedRef}
      disabled={isDisabled}
    />
  );
});

/* -------------------------------------------------------------------------------------------------
 * Abort
 * -----------------------------------------------------------------------------------------------*/

/**
 * A button to abort a response related to the AI composer.
 *
 * @example
 * <AiComposer.Abort>Cancel</AiComposer.Abort>
 */
export const AiComposerAbort = forwardRef<
  HTMLButtonElement,
  AiComposerSubmitProps
>(({ disabled, onClick, asChild, ...props }, forwardedRef) => {
  const Component = asChild ? Slot : "button";
  const { isDisabled: isComposerDisabled, canAbort, abort } = useAiComposer();
  const isDisabled = isComposerDisabled || disabled || !canAbort;

  const handleClick = useCallback(
    (event: MouseEvent<HTMLButtonElement>) => {
      onClick?.(event);

      if (event.isDefaultPrevented()) {
        return;
      }

      abort();
    },
    [abort, onClick]
  );

  return (
    <Component
      type="button"
      {...props}
      ref={forwardedRef}
      disabled={isDisabled}
      onClick={handleClick}
    />
  );
});

if (process.env.NODE_ENV !== "production") {
  AiComposerEditor.displayName = AI_COMPOSER_EDITOR_NAME;
  AiComposerForm.displayName = AI_COMPOSER_FORM_NAME;
  AiComposerSubmit.displayName = AI_COMPOSER_SUBMIT_NAME;
  AiComposerAbort.displayName = AI_COMPOSER_ABORT_NAME;
}

// NOTE: Every export from this file will be available publicly as AiComposer.*
export {
  AiComposerAbort as Abort,
  AiComposerEditor as Editor,
  AiComposerForm as Form,
  AiComposerSubmit as Submit,
};
