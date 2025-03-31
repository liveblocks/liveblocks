import { HttpError, kInternal, nanoid } from "@liveblocks/core";
import { useClient } from "@liveblocks/react";
import { useLayoutEffect } from "@liveblocks/react/_private";
import {
  type ButtonHTMLAttributes,
  createContext,
  type FormEvent,
  type FormHTMLAttributes,
  forwardRef,
  type HTMLAttributes,
  type KeyboardEvent,
  useCallback,
  useContext,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  type BaseEditor,
  createEditor,
  type Descendant,
  Editor as SlateEditor,
  Transforms,
} from "slate";
import type { HistoryEditor } from "slate-history";
import { withHistory } from "slate-history";
import { Editable, ReactEditor, Slate, withReact } from "slate-react";

import { withNormalize } from "../../../slate/plugins/normalize";
import { isEmpty } from "../../../slate/utils/is-empty";
import { AttachmentTooLargeError } from "../../Composer/utils";

/* -------------------------------------------------------------------------------------------------
 * Form
 * -----------------------------------------------------------------------------------------------*/
export const ComposerContext = createContext<{
  editor: SlateEditor;
  onEditorValueChange: (value: Descendant[]) => void;
  isEditorEmpty: boolean;

  attachments: ({
    id: string;
    file: File;
  } & (
    | {
        status: "uploading" | "uploaded";
      }
    | {
        status: "error";
        error: Error;
      }
  ))[];
  onAttachFiles: () => void;
  onRemoveAttachment: (id: string) => void;
  numOfAttachments: number;

  requestFormSubmit: () => void;
  disabled: boolean;
} | null>(null);

export const MAX_ATTACHMENTS = 10;
export const MAX_ATTACHMENT_SIZE = 1024 * 1024 * 1024; // 1 GB

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
    const fileInputRef = useRef<HTMLInputElement | null>(null);

    const editorRef = useRef<(BaseEditor & ReactEditor & HistoryEditor) | null>(
      null
    );
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
    }, [editor]);

    const handleEditorValueChange = useCallback(() => {
      setIsEditorEmpty(isEmpty(editor, editor.children));
    }, [editor]);

    const requestFormSubmit = useCallback(() => {
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
    }, [editor]);

    const [attachments, setAttachments] = useState<
      ({
        id: string;
        file: File;
      } & (
        | {
            status: "uploading" | "uploaded";
          }
        | {
            status: "error";
            error: Error;
          }
      ))[]
    >([]);

    const handleAttachFiles = useCallback(() => {
      if (disabled) return;
      fileInputRef.current?.click();
    }, [disabled]);

    const handleRemoveAttachment = useCallback((id: string) => {
      setAttachments((attachments) =>
        attachments.filter((attachment) => attachment.id !== id)
      );
    }, []);

    useImperativeHandle<HTMLFormElement | null, HTMLFormElement | null>(
      forwardedRef,
      () => formRef.current,
      []
    );

    const client = useClient();

    return (
      <ComposerContext.Provider
        value={{
          editor,
          onEditorValueChange: handleEditorValueChange,
          isEditorEmpty,
          requestFormSubmit,
          disabled: disabled || false,
          attachments,
          onAttachFiles: handleAttachFiles,
          onRemoveAttachment: handleRemoveAttachment,
          numOfAttachments: attachments.length,
        }}
      >
        <form onSubmit={handleSubmit} {...props} ref={formRef} />
        <input
          type="file"
          multiple
          accept="image/png, image/jpeg"
          ref={fileInputRef}
          onClick={(event) => {
            event.stopPropagation();
          }}
          onChange={function (event) {
            if (disabled) return;

            if (event.target.files === null) return;
            if (event.target.files.length === 0) return;

            for (const file of Array.from(event.target.files).slice(
              0,
              MAX_ATTACHMENTS - attachments.length
            )) {
              const id = `at_${nanoid()}`;
              if (file.size > MAX_ATTACHMENT_SIZE) {
                setAttachments((attachments) => [
                  ...attachments,
                  {
                    id,
                    file,
                    status: "error",
                    error: new AttachmentTooLargeError("File is too large."),
                  },
                ]);
                continue;
              }

              setAttachments((attachments) => [
                ...attachments,
                {
                  id,
                  file,
                  status: "uploading",
                },
              ]);

              client[kInternal].httpClient
                .uploadUserAttachment({
                  attachment: {
                    id,
                    file,
                  },
                })
                .then(() => {
                  setAttachments((attachments) =>
                    attachments.map((attachment) =>
                      attachment.id === id
                        ? { ...attachment, status: "uploaded" }
                        : attachment
                    )
                  );
                })
                .catch((error) => {
                  if (error instanceof Error) {
                    setAttachments((attachments) =>
                      attachments.map((attachment) =>
                        attachment.id === id
                          ? {
                              ...attachment,
                              status: "error",
                              error:
                                error instanceof HttpError &&
                                error.status === 413
                                  ? new AttachmentTooLargeError(
                                      "File is too large"
                                    )
                                  : error,
                            }
                          : attachment
                      )
                    );
                  }
                });
            }

            event.target.value = "";
          }}
          tabIndex={-1}
          style={{ display: "none" }}
        />
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
      [editor, onKeyDown, requestFormSubmit]
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

/* -------------------------------------------------------------------------------------------------
 * AttachFiles
 * -----------------------------------------------------------------------------------------------*/
export type AttachFilesProps = ButtonHTMLAttributes<HTMLButtonElement>;

/**
 * A button which opens a file picker to create attachments.
 *
 * @example
 * <Composer.AttachFiles>Attach files</Composer.AttachFiles>
 */
export const AttachFiles = forwardRef<HTMLButtonElement, AttachFilesProps>(
  ({ onClick, disabled, ...props }, forwardedRef) => {
    const context = useContext(ComposerContext);
    if (context === null) {
      throw new Error("AttachFiles must be a descendant of Form.");
    }

    const {
      disabled: isFormDisabled,
      onAttachFiles,
      numOfAttachments,
    } = context;

    return (
      <button
        type="button"
        {...props}
        onClick={function (event) {
          onClick?.(event);
          if (event.isDefaultPrevented()) return;
          onAttachFiles();
        }}
        onPointerDown={(event) => event.preventDefault()}
        ref={forwardedRef}
        disabled={
          isFormDisabled || disabled || numOfAttachments >= MAX_ATTACHMENTS
        }
      />
    );
  }
);
