import { HttpError, kInternal, nanoid } from "@liveblocks/core";
import { useClient } from "@liveblocks/react";
import { ChatComposerOverrides, useOverrides } from "@liveblocks/react-ui";
import {
  ShortcutTooltip,
  Tooltip,
  TooltipProvider,
} from "@liveblocks/react-ui/_private";
import { getUmbrellaStoreForClient } from "@liveblocks/react/_private";
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
  useEffect,
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

/* -------------------------------------------------------------------------------------------------
 * Composer
 * -----------------------------------------------------------------------------------------------*/
type ComposerProps = FormHTMLAttributes<HTMLFormElement> & {
  chatId: string;
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
      chatId,
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

    const client = useClient();
    const store = getUmbrellaStoreForClient(client);

    const handleComposerSubmit = useCallback(
      async (message: { text: string }, event: FormEvent<HTMLFormElement>) => {
        if (status.state !== "ready" || disabled) return;

        onComposerSubmit?.(message, event);
        if (event.isDefaultPrevented()) return;

        const messageId = nanoid(24);
        const messages = Object.values(
          store.copilotChatMessages.signal.get()[chatId]
        );
        store.copilotChatMessages.update(chatId, [
          ...messages,
          {
            type: "chat-message",
            chatId,
            id: messageId,
            role: "user",
            createdAt: new Date(),
            content: [{ type: "text", text: message.text }],
          },
        ]);
        const stream = await client[
          kInternal
        ].httpClient.createCopilotChatMessage(chatId, {
          id: messageId,
          text: message.text,
        });

        const assistantMessageId = nanoid(24);
        const reader = stream.getReader();

        let content = "";
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          content += value;

          const messages = store.copilotChatMessages.signal.get()[chatId];

          if (messages[assistantMessageId] === undefined) {
            store.copilotChatMessages.update(chatId, [
              ...Object.values(messages),
              {
                type: "chat-message",
                chatId,
                id: assistantMessageId,
                role: "assistant",
                createdAt: new Date(),
                content: [{ type: "text", text: content }],
              },
            ]);
          } else {
            store.copilotChatMessages.update(
              chatId,
              Object.values(messages).map((message) => {
                if (message.id === assistantMessageId) {
                  return {
                    ...message,
                    content: [{ type: "text", text: content }],
                  };
                }
                return message;
              })
            );
          }
        }

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

            <Attachments />

            <div className="lb-chat-composer-footer">
              <div className="lb-chat-composer-editor-actions">
                <Tooltip content={$.CHAT_COMPOSER_ATTACH_FILES}>
                  <AttachFiles
                    className="lb-button"
                    aria-label={$.CHAT_COMPOSER_ATTACH_FILES}
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
                        <path d="m14.077 11.737-3.723 3.62c-1.55 1.507-4.128 1.507-5.678 0-1.543-1.5-1.543-4.02 0-5.52l5.731-5.573c1.034-1.006 2.754-1.007 3.789-.003 1.03 1 1.032 2.682.003 3.684l-5.744 5.572a1.377 1.377 0 0 1-1.893 0 1.283 1.283 0 0 1-.392-.92c0-.345.14-.676.392-.92L10.348 8" />
                      </svg>
                    </span>
                  </AttachFiles>
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

  attachments: ({
    id: string;
    file: File;
    name: string;
    size: number;
    mimeType: string;
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

  isEditorEmpty: boolean;
  requestFormSubmit: () => void;
  disabled: boolean;
} | null>(null);

const MAX_ATTACHMENTS = 10;
const MAX_ATTACHMENT_SIZE = 1024 * 1024 * 1024; // 1 GB

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
        name: string;
        size: number;
        mimeType: string;
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

    useEffect(() => {
      window.api = client[kInternal].httpClient;
      window.nanoid = nanoid;
    }, []);

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
                    name: file.name,
                    size: file.size,
                    mimeType: file.type,
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
                  name: file.name,
                  size: file.size,
                  mimeType: file.type,
                  status: "uploading",
                },
              ]);

              client[kInternal].httpClient
                .uploadAttachment({
                  // @nimesh - Replace this with `uploadUserAttachment`, that identifies an attachment to a user instead of a room.
                  roomId: "liveblocks:examples:ai",
                  attachment: {
                    id,
                    name: file.name,
                    size: file.size,
                    mimeType: file.type,
                    file,
                    type: "localAttachment",
                    status: "uploading",
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

/* -------------------------------------------------------------------------------------------------
 * AttachFiles
 * -----------------------------------------------------------------------------------------------*/
/**
 * A button which opens a file picker to create attachments.
 *
 * @example
 * <Composer.AttachFiles>Attach files</Composer.AttachFiles>
 */
const AttachFiles = forwardRef<
  HTMLButtonElement,
  ButtonHTMLAttributes<HTMLButtonElement>
>(({ onClick, disabled, ...props }, forwardedRef) => {
  const context = useContext(ComposerContext);
  if (context === null) {
    throw new Error("AttachFiles must be a descendant of Form.");
  }

  const { disabled: isFormDisabled, onAttachFiles, numOfAttachments } = context;

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
});

/* -------------------------------------------------------------------------------------------------
 * Attachment
 * -----------------------------------------------------------------------------------------------*/
type AttachmentsProps = HTMLAttributes<HTMLDivElement>;
export const Attachments = forwardRef<HTMLDivElement, AttachmentsProps>(
  ({ className, ...props }, forwardedRef) => {
    const context = useContext(ComposerContext);
    if (context === null) {
      throw new Error("Attachments must be a descendant of Form.");
    }

    const { attachments } = context;

    return (
      <div
        {...props}
        ref={forwardedRef}
        className={classNames("lb-chat-composer-attachments", className)}
      >
        <div className="lb-attachments">
          {attachments.map((attachment) => (
            <Attachment key={attachment.id} {...attachment} />
          ))}
        </div>
      </div>
    );
  }
);

function Attachment(
  props: {
    id: string;
    name: string;
    size: number;
    file: File;
    mimeType: string;
  } & (
    | {
        status: "uploading" | "uploaded";
      }
    | {
        status: "error";
        error: Error;
      }
  )
) {
  if (!props.mimeType.startsWith("image/")) {
    throw new Error("Attachment must be an image.");
  }

  const context = useContext(ComposerContext);
  if (context === null) {
    throw new Error("Attachment must be a descendant of Form.");
  }

  const { onRemoveAttachment } = context;

  function AttachmentPreview({
    id,
    name,
    size,
    mimeType,
    file,
    status,
  }: {
    id: string;
    name: string;
    size: number;
    mimeType: string;
    file: File;
    status: "uploading" | "uploaded";
  }) {
    const [preview, setPreview] = useState<string | null>(null);

    useEffect(() => {
      function handleLoad() {
        setPreview(reader.result as string);
      }

      const reader = new FileReader();
      reader.addEventListener("loadend", handleLoad);
      reader.readAsDataURL(file);

      return () => {
        reader.removeEventListener("loadend", handleLoad);
        reader.abort();
      };
    }, []);

    if (preview === null) {
      return (
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
          <path d="M3 10a7 7 0 0 1 7-7" className="lb-icon-spinner" />
        </svg>
      );
    }

    return (
      <div className="lb-attachment-preview-media">
        <img src={preview} loading="lazy" />
      </div>
    );
  }

  function splitFileName(name: string) {
    const match = name.match(/^(.+?)(\.[^.]+)?$/);
    return { base: match?.[1] ?? name, extension: match?.[2] };
  }

  const { base, extension } = splitFileName(props.name);
  const $ = useOverrides();

  let description: string;
  if (props.status === "error") {
    if (props.error instanceof AttachmentTooLargeError) {
      description = $.ATTACHMENT_TOO_LARGE(
        MAX_ATTACHMENT_SIZE
          ? formatFileSize(MAX_ATTACHMENT_SIZE, $.locale)
          : undefined
      );
    } else {
      description = $.ATTACHMENT_ERROR(props.error);
    }
  } else {
    description = formatFileSize(props.size, $.locale);
  }

  return (
    <div
      className="lb-attachment lb-file-attachment lb-composer-attachment"
      data-error={props.status === "error" ? "" : undefined}
    >
      <div className="lb-attachment-preview">
        {props.status === "uploading" ? (
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
            <path d="M3 10a7 7 0 0 1 7-7" className="lb-icon-spinner" />
          </svg>
        ) : props.status === "error" ? (
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
            <path d="m3.794 13.526 5.326-9.89a1 1 0 0 1 1.76 0l5.326 9.89a1 1 0 0 1-.88 1.474H4.674a1 1 0 0 1-.88-1.474ZM10 7.5v2m0 2.5h.007" />
            <circle cx={10} cy={12} r={0.25} />
          </svg>
        ) : (
          <AttachmentPreview {...props} />
        )}
      </div>

      <div className="lb-attachment-details">
        <span className="lb-attachment-name" title={props.name}>
          <span className="lb-attachment-name-base">{base}</span>
          {extension && (
            <span className="lb-attachment-name-extension">{extension}</span>
          )}
        </span>

        <span className="lb-attachment-description" title={description}>
          {description}
        </span>
      </div>
      <Tooltip content={$.CHAT_COMPOSER_REMOVE_ATTACHMENT}>
        <button
          type="button"
          className="lb-attachment-delete"
          onClick={() => onRemoveAttachment(props.id)}
          aria-label={$.CHAT_COMPOSER_REMOVE_ATTACHMENT}
        >
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
            <path d="M15 5L5 15" />
            <path d="M5 5L15 15" />
          </svg>
        </button>
      </Tooltip>
    </div>
  );
}

class AttachmentTooLargeError extends Error {
  name = "AttachmentTooLargeError";
  constructor(message: string) {
    super(message);
  }
}

const BASE = 1000;
const UNITS = ["B", "KB", "MB", "GB"] as const;

function formatFileSize(bytes: number, locale?: string) {
  if (bytes === 0) {
    return `0 ${UNITS[1]}`;
  }

  let unit: number;

  if (bytes === 0) {
    unit = 1;
  } else {
    unit = Math.max(
      1,
      Math.min(
        Math.floor(Math.log(Math.abs(bytes)) / Math.log(BASE)),
        UNITS.length - 1
      )
    );
  }

  let value = bytes / BASE ** unit;
  let maximumDecimals = 1;

  if (unit === 1) {
    // Hide decimals for KB values above 10
    if (value >= 10) {
      maximumDecimals = 0;
    }

    // Allow 2 decimals instead of 1 for KB values below 0.1
    if (value < 0.1 && value > 0) {
      maximumDecimals = 2;
    }

    // Display tiny KB values as 0.01 KB instead of 0 KB
    if (value < 0.01) {
      value = 0.01;
    }
  }

  const formattedUnit = UNITS[unit];
  const formattedValue = new Intl.NumberFormat(locale, {
    minimumFractionDigits: 0,
    maximumFractionDigits: maximumDecimals,
  }).format(value);

  return `${formattedValue} ${formattedUnit}`;
}

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

function withNormalize(editor: BaseEditor & ReactEditor & HistoryEditor) {
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
