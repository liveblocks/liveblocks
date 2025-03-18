import { ChatComposerOverrides, useOverrides } from "@liveblocks/react-ui";
import {
  ShortcutTooltip,
  Tooltip,
  TooltipProvider,
} from "@liveblocks/react-ui/_private";
import {
  FormHTMLAttributes,
  FormEvent,
  useCallback,
  createContext,
  useContext,
  ButtonHTMLAttributes,
  HTMLAttributes,
  useRef,
  forwardRef,
  KeyboardEvent,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useState,
} from "react";
import {
  BaseEditor,
  createEditor,
  Node,
  Text,
  Editor as SlateEditor,
  Element,
  Descendant,
  Transforms,
} from "slate";
import { HistoryEditor, withHistory } from "slate-history";
import { Editable, ReactEditor, Slate, withReact } from "slate-react";

type ComposerProps = FormHTMLAttributes<HTMLFormElement> & {
  /**
   * The composer's initial value.
   */
  defaultValue?: string;
  /**
   * The event handler called when a chat message is submitted.
   */
  onComposerSubmit?: (
    message: {
      /**
       * The submitted message text.
       */
      text: string;
    },
    event: FormEvent<HTMLFormElement>
  ) => void;
  /**
   * Whether the composer is disabled.
   */
  disabled?: boolean;
  /**
   * Override the component's strings.
   */
  overrides?: Partial<ChatComposerOverrides>;
};
export const Composer = forwardRef<HTMLFormElement, ComposerProps>(
  (
    {
      defaultValue,
      onComposerSubmit,
      disabled,
      overrides,
      className,
      ...props
    },
    forwardedRef
  ) => {
    const $ = useOverrides(overrides);
    const status = useLastMessageStatus();

    const handleComposerSubmit = useCallback(
      (message: { text: string }, event: FormEvent<HTMLFormElement>) => {
        if (status.state !== "ready" || disabled) return;

        onComposerSubmit?.(message, event);
        if (event.isDefaultPrevented()) return;

        console.log(message);
        /* send(message.text) */
      },
      []
    );

    return (
      <TooltipProvider>
        <Form
          className={classNames(
            "lb-root lb-chat-composer lb-chat-composer-form",
            className
          )}
          dir={$.dir}
          {...props}
          disabled={disabled || status.state !== "ready"}
          ref={forwardedRef}
          onComposerSubmit={handleComposerSubmit}
        >
          <div className="lb-chat-composer-editor-container">
            <Editor
              autoFocus
              className="lb-chat-composer-editor"
              placeholder={$.CHAT_COMPOSER_PLACEHOLDER}
              defaultValue={defaultValue}
            />

            <div className="lb-chat-composer-footer">
              <div className="lb-chat-composer-editor-actions">
                <Tooltip content={$.CHAT_COMPOSER_ATTACH_FILES}>
                  <button type="button" className="lb-button">
                    <span className="lb-icon-container">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width={20}
                        height={20}
                        viewBox={`0 0 ${20} ${20}`}
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={1.5}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        role="presentation"
                        className="lb-icon"
                      >
                        <path d="m14.077 11.737-3.723 3.62c-1.55 1.507-4.128 1.507-5.678 0-1.543-1.5-1.543-4.02 0-5.52l5.731-5.573c1.034-1.006 2.754-1.007 3.789-.003 1.03 1 1.032 2.682.003 3.684l-5.744 5.572a1.377 1.377 0 0 1-1.893 0 1.283 1.283 0 0 1-.392-.92c0-.345.14-.676.392-.92L10.348 8" />
                      </svg>
                    </span>
                  </button>
                </Tooltip>
              </div>

              <div className="lb-chat-composer-actions">
                <ShortcutTooltip
                  content={$.CHAT_COMPOSER_SEND}
                  shortcut="Enter"
                >
                  <Submit
                    className="lb-button"
                    data-variant="primary"
                    data-size="default"
                    aria-label={$.CHAT_COMPOSER_SEND}
                  >
                    <span className="lb-icon-container">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width={20}
                        height={20}
                        viewBox={`0 0 ${20} ${20}`}
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={1.5}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        role="presentation"
                        className="lb-icon"
                      >
                        <path d="m5 16 12-6L5 4l2 6-2 6ZM7 10h10" />
                      </svg>
                    </span>
                  </Submit>
                </ShortcutTooltip>
              </div>
            </div>
          </div>
        </Form>
      </TooltipProvider>
    );
  }
);

/* -------------------------------------------------------------------------------------------------
 * Form
 * -----------------------------------------------------------------------------------------------*/
export type FormProps = FormHTMLAttributes<HTMLFormElement> & {
  /**
   * The event handler called when a chat message is submitted.
   */
  onComposerSubmit?: (
    message: {
      /**
       * The submitted message text.
       */
      text: string;
    },
    event: FormEvent<HTMLFormElement>
  ) => void;
  /**
   * Whether the composer is disabled.
   */
  disabled?: boolean;
};

const ComposerContext = createContext<{
  editor: SlateEditor;
  onEditorValueChange: (value: Descendant[]) => void;
  isEditorEmpty: boolean;
  requestFormSubmit: () => void;
  disabled: boolean;
} | null>(null);

/**
 * Surrounds the chat composer's content and handles submissions.
 *
 * @example
 * <Form onComposerSubmit={({ text }) => {}}>
 *	 <Editor />
 *   <Submit />
 * </Form>
 */
export const Form = forwardRef<HTMLFormElement, FormProps>(
  ({ onComposerSubmit, onSubmit, disabled, ...props }, forwardedRef) => {
    const formRef = useRef<HTMLFormElement | null>(null);

    const editorRef = useRef<(BaseEditor & ReactEditor & HistoryEditor) | null>(
      null
    );
    if (editorRef.current === null) {
      editorRef.current = withNormalize(withHistory(withReact(createEditor())));
    }
    const editor = editorRef.current!;

    const [isEditorEmpty, setIsEditorEmpty] = useState(true);

    const handleSubmit = useCallback(
      (event: FormEvent<HTMLFormElement>) => {
        if (disabled || isEmpty(editor, editor.children)) return;

        onSubmit?.(event);
        if (onComposerSubmit === undefined || event.isDefaultPrevented()) {
          event.preventDefault();
          return;
        }

        const content = editor.children
          .map((block) => {
            if ("type" in block && block.type === "paragraph") {
              return block.children.map((child) => child.text).join("");
            }
            return "";
          })
          .join("\n");

        onComposerSubmit({ text: content }, event);

        event.preventDefault();

        /* send(message) */

        // Clear the editor after dispatching the message.
        Transforms.delete(editor, {
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
    }, []);

    const handleEditorValueChange = useCallback(() => {
      setIsEditorEmpty(isEmpty(editor, editor.children));
    }, []);

    useImperativeHandle<HTMLFormElement | null, HTMLFormElement | null>(
      forwardedRef,
      () => formRef.current,
      []
    );

    return (
      <ComposerContext.Provider
        value={{
          editor,
          onEditorValueChange: handleEditorValueChange,
          isEditorEmpty,
          requestFormSubmit: function () {
            if (isEmpty(editor, editor.children)) return;

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
          },
          disabled: disabled || false,
        }}
      >
        <form onSubmit={handleSubmit} {...props} ref={formRef} />
      </ComposerContext.Provider>
    );
  }
);

/* -------------------------------------------------------------------------------------------------
 * Editor
 * -----------------------------------------------------------------------------------------------*/
export type EditorProps = Omit<
  HTMLAttributes<HTMLDivElement>,
  "defaultValue"
> & {
  /**
   * The editor's initial value.
   */
  defaultValue?: string;
  /**
   * The text to display when the editor is empty.
   */
  placeholder?: string;
  /**
   * Whether the editor is disabled.
   */
  disabled?: boolean;
  /**
   * Whether to focus the editor on mount.
   */
  autoFocus?: boolean;
};

/**
 * Displays the chat composer's editor.
 *
 * @example
 * <Editor placeholder="Write a message…" />
 */
export const Editor = forwardRef<HTMLDivElement, EditorProps>(
  (
    { defaultValue = "", onKeyDown, disabled, autoFocus, ...props },
    forwardedRef
  ) => {
    const context = useContext(ComposerContext);
    if (context === null) {
      throw new Error("Editor must be a descendant of Form.");
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
      []
    );

    useImperativeHandle(
      forwardedRef,
      () => ReactEditor.toDOMNode(editor, editor) as HTMLDivElement,
      [editor]
    );

    useLayoutEffect(() => {
      if (!autoFocus) return;
      try {
        if (!ReactEditor.isFocused(editor)) {
          Transforms.select(editor, SlateEditor.end(editor, []));
          ReactEditor.focus(editor);
        }
      } catch {
        // Slate's DOM-specific methods will throw if the editor's DOM  node no longer exists. This action doesn't make sense on an unmounted editor so we can safely ignore it.
      }
    }, [editor]);

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
export type SubmitProps = ButtonHTMLAttributes<HTMLButtonElement>;

/**
 * A button to submit a chat message.
 *
 * @example
 * <ChatComposer.Submit>Send</ChatComposer.Submit>
 */
export const Submit = forwardRef<HTMLButtonElement, SubmitProps>(
  ({ disabled, ...props }, forwardedRef) => {
    const context = useContext(ComposerContext);
    if (context === null) {
      throw new Error("Submit must be a descendant of Form.");
    }

    const { disabled: isFormDisabled, isEditorEmpty } = context;

    return (
      <button
        type="submit"
        {...props}
        ref={forwardedRef}
        disabled={disabled || isFormDisabled || isEditorEmpty}
      />
    );
  }
);

/**
 * Accepts a message id and returns the submission status of the message. The status can be one of the following:
 * - "submitted": The message has been submitted and is awaiting a response.
 * - "streaming": The message is being processed.
 * - "ready": The message is ready to be displayed.
 * - "error": An error occurred while submitting the message.
 * @param id The id of the message.
 * @returns The submission status of the message.
 */
function useLastMessageStatus():
  | {
      state: "submitted";
    }
  | {
      state: "streaming";
      text: string;
    }
  | {
      state: "ready";
      text: string;
    }
  | {
      state: "error";
      message: string;
    } {
  return {
    state: "ready",
    text: "Processing…",
  };
}

function isEmpty(editor: SlateEditor, children: Descendant[]) {
  // Check if all blocks are empty, stopping at the first non-empty block
  for (const child of children) {
    if (isText(child)) {
      // Non-empty text
      if (!isEmptyString(child.text)) {
        return false;
      }
    } else if (child.type === "paragraph") {
      // Non-empty paragraph
      if (
        child.children.length > 1 ||
        (child.children[0] &&
          !(isText(child.children[0]) && isEmptyString(child.children[0].text)))
      ) {
        return false;
      }
    } else {
      // Non-empty other block
      if (!SlateEditor.isEmpty(editor, child)) {
        return false;
      }
    }
  }

  return true;
}

function isText(element: Node): element is Text {
  return (
    !("type" in element) &&
    "text" in element &&
    typeof element.text === "string"
  );
}

function isEmptyString(string: string) {
  return !string.trim();
}

declare module "slate" {
  interface CustomTypes {
    Editor: BaseEditor & ReactEditor & HistoryEditor;
    Element: {
      type: "paragraph";
      children: { text: string }[];
    };
    Text: { text: string };
  }
}

export function withNormalize(
  editor: BaseEditor & ReactEditor & HistoryEditor
) {
  const { normalizeNode } = editor;

  editor.normalizeNode = (entry) => {
    const [node, path] = entry;

    // Paragraphs should only contain inline elements
    if (Element.isElement(node) && node.type === "paragraph") {
      for (const [child, childPath] of Node.children(editor, path)) {
        if (Element.isElement(child) && !editor.isInline(child)) {
          Transforms.unwrapNodes(editor, { at: childPath });
          return;
        }
      }
    }

    normalizeNode(entry);
  };

  return editor;
}

function classNames(...args: (string | number | boolean | undefined | null)[]) {
  return args
    .filter((arg) => typeof arg === "string" || typeof arg === "number")
    .join(" ");
}
