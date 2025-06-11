import { useLayoutEffect } from "@liveblocks/react/_private";
import { Slot } from "@radix-ui/react-slot";
import type { FormEvent, KeyboardEvent } from "react";
import {
  createContext,
  forwardRef,
  useCallback,
  useContext,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import type { Descendant as SlateDescendant } from "slate";
import {
  createEditor,
  Editor as SlateEditor,
  Transforms as SlateTransforms,
} from "slate";
import { withHistory } from "slate-history";
import { Editable, ReactEditor, Slate, withReact } from "slate-react";

import type { AiComposerEditor } from "../../types";
import { withNormalize } from "../slate/plugins/normalize";
import { isEmpty } from "../slate/utils/is-empty";
import type {
  AiChatComposerEditorProps,
  AiChatComposerFormProps,
  AiChatComposerSubmitProps,
} from "./types";

const AI_CHAT_COMPOSER_SUBMIT_NAME = "AiChatComposerSubmit";
const AI_CHAT_COMPOSER_EDITOR_NAME = "AiChatComposerEditor";
const AI_CHAT_COMPOSER_FORM_NAME = "AiChatComposerForm";

const AiChatComposerContext = createContext<{
  editor: SlateEditor;
  onEditorValueChange: (value: SlateDescendant[]) => void;
  isEditorEmpty: boolean;

  requestFormSubmit: () => void;
  disabled: boolean;
} | null>(null);

/* -------------------------------------------------------------------------------------------------
 * Form
 * -----------------------------------------------------------------------------------------------*/

/**
 * Surrounds the chat composer's content and handles submissions.
 *
 * @example
 * <AiChatComposer.Form onComposerSubmit={({ text }) => {}}>
 *	 <AiChatComposer.Editor />
 *   <AiChatComposer.Submit />
 * </AiChatComposer.Form>
 */
export const AiChatComposerForm = forwardRef<
  HTMLFormElement,
  AiChatComposerFormProps
>(
  (
    { onComposerSubmit, onSubmit, disabled, asChild, ...props },
    forwardedRef
  ) => {
    const Component = asChild ? Slot : "form";
    const formRef = useRef<HTMLFormElement | null>(null);

    const editorRef = useRef<AiComposerEditor | null>(null);
    if (editorRef.current === null) {
      editorRef.current = withNormalize(withHistory(withReact(createEditor())));
    }
    const editor = editorRef.current;

    const [isEditorEmpty, setIsEditorEmpty] = useState(true);

    const handleSubmit = useCallback(
      (event: FormEvent<HTMLFormElement>) => {
        if (disabled || isEmpty(editor, editor.children)) return;

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

        onComposerSubmit({ text: content }, event);

        if (event.isDefaultPrevented()) {
          return;
        }

        event.preventDefault();

        // Clear the editor after dispatching the message.
        SlateTransforms.delete(editor, {
          at: {
            anchor: SlateEditor.start(editor, []),
            focus: SlateEditor.end(editor, []),
          },
        });
      },
      [disabled, editor, onSubmit, onComposerSubmit]
    );

    useLayoutEffect(() => {
      setIsEditorEmpty(isEmpty(editor, editor.children));
    }, [editor]);

    const handleEditorValueChange = useCallback(() => {
      setIsEditorEmpty(isEmpty(editor, editor.children));
    }, [editor]);

    const requestFormSubmit = useCallback(() => {
      if (isEmpty(editor, editor.children)) return;

      // We need to wait for the next frame in some cases like when composing diacritics,
      // we want any native handling to be done first while still being handled on `keydown`.
      requestAnimationFrame(() => {
        if (formRef.current === null) return;
        if (typeof formRef.current.requestSubmit === "function") {
          return formRef.current.requestSubmit();
        }
        const submitter = document.createElement("input");
        submitter.type = "submit";
        submitter.hidden = true;
        formRef.current.appendChild(submitter);
        submitter.click();
        formRef.current.removeChild(submitter);
      });
    }, [editor]);

    useImperativeHandle<HTMLFormElement | null, HTMLFormElement | null>(
      forwardedRef,
      () => formRef.current,
      []
    );

    return (
      <AiChatComposerContext.Provider
        value={{
          editor,
          onEditorValueChange: handleEditorValueChange,
          isEditorEmpty,
          requestFormSubmit,
          disabled: disabled || false,
        }}
      >
        <Component onSubmit={handleSubmit} {...props} ref={formRef} />
      </AiChatComposerContext.Provider>
    );
  }
);

/* -------------------------------------------------------------------------------------------------
 * Editor
 * -----------------------------------------------------------------------------------------------*/

/**
 * Displays the chat composer's editor.
 *
 * @example
 * <AiChatComposer.Editor placeholder="Write a message…" />
 */
export const AiChatComposerEditor = forwardRef<
  HTMLDivElement,
  AiChatComposerEditorProps
>(
  (
    { defaultValue = "", onKeyDown, disabled, autoFocus, ...props },
    forwardedRef
  ) => {
    const context = useContext(AiChatComposerContext);
    if (context === null) {
      throw new Error("AiChatComposer.Form is missing from the React tree.");
    }

    const {
      editor,
      onEditorValueChange,
      requestFormSubmit,
      disabled: isFormDisabled,
    } = context;

    const handleKeyDown = useCallback(
      (event: KeyboardEvent<HTMLDivElement>) => {
        onKeyDown?.(event);
        if (event.isDefaultPrevented()) return;

        if (event.key === "Enter" && !event.shiftKey) {
          event.preventDefault();
          requestFormSubmit();
        } else if (event.key === "Enter" && event.shiftKey) {
          event.preventDefault();
          editor.insertBreak();
        }
      },
      [editor, onKeyDown, requestFormSubmit]
    );

    useImperativeHandle(
      forwardedRef,
      () => ReactEditor.toDOMNode(editor, editor) as HTMLDivElement,
      [editor]
    );

    useEffect(() => {
      if (!autoFocus) return;

      try {
        if (!ReactEditor.isFocused(editor)) {
          SlateTransforms.select(editor, SlateEditor.end(editor, []));
          ReactEditor.focus(editor);
        }
      } catch {
        // Slate's DOM-specific methods will throw if the editor's DOM  node no longer exists. This action doesn't make sense on an unmounted editor so we can safely ignore it.
      }
    }, [editor, autoFocus]);

    const initialValue: { type: "paragraph"; children: { text: string }[] }[] =
      useMemo(() => {
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
          enterKeyHint="send"
          autoCapitalize="sentences"
          onKeyDown={handleKeyDown}
          data-disabled={disabled || isFormDisabled || undefined}
          {...props}
          readOnly={disabled || isFormDisabled}
          disabled={disabled || isFormDisabled}
          renderPlaceholder={function ({ attributes, children }) {
            const { opacity: _opacity, ...style } = attributes.style;
            return (
              <span {...attributes} style={style} data-placeholder="">
                {children}
              </span>
            );
          }}
        />
      </Slate>
    );
  }
);

/* -------------------------------------------------------------------------------------------------
 * Submit
 * -----------------------------------------------------------------------------------------------*/

/**
 * A button to submit a chat message.
 *
 * @example
 * <AiChatComposer.Submit>Send</AiChatComposer.Submit>
 */
export const AiChatComposerSubmit = forwardRef<
  HTMLButtonElement,
  AiChatComposerSubmitProps
>(({ disabled, asChild, ...props }, forwardedRef) => {
  const Component = asChild ? Slot : "button";
  const context = useContext(AiChatComposerContext);
  if (context === null) {
    throw new Error("AiChatComposer.Form is missing from the React tree.");
  }

  const { disabled: isFormDisabled, isEditorEmpty } = context;

  return (
    <Component
      type="submit"
      {...props}
      ref={forwardedRef}
      disabled={disabled || isFormDisabled || isEditorEmpty}
    />
  );
});

if (process.env.NODE_ENV !== "production") {
  AiChatComposerEditor.displayName = AI_CHAT_COMPOSER_EDITOR_NAME;
  AiChatComposerForm.displayName = AI_CHAT_COMPOSER_FORM_NAME;
  AiChatComposerSubmit.displayName = AI_CHAT_COMPOSER_SUBMIT_NAME;
}

// NOTE: Every export from this file will be available publicly as AiChatComposer.*
export {
  AiChatComposerEditor as Editor,
  AiChatComposerForm as Form,
  AiChatComposerSubmit as Submit,
};
