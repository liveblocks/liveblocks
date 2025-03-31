import { assert, type AsyncResult, kInternal, shallow } from "@liveblocks/core";
import { useClient } from "@liveblocks/react";
import { useSyncExternalStoreWithSelector } from "@liveblocks/react/_private";
import {
  type FormEvent,
  type FormHTMLAttributes,
  forwardRef,
  type HTMLAttributes,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

import {
  CrossIcon,
  ShortcutTooltip,
  SpinnerIcon,
  Tooltip,
  TooltipProvider,
  WarningIcon,
} from "../../_private";
import { type ChatComposerOverrides, useOverrides } from "../../overrides";
import { AttachmentTooLargeError } from "../../primitives";
import * as ComposerPrimitive from "../../primitives/Chat/Composer";
import { classNames } from "../../utils/class-names";
import { formatFileSize } from "../../utils/format-file-size";

/* -------------------------------------------------------------------------------------------------
 * Composer
 * -----------------------------------------------------------------------------------------------*/
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

    const handleComposerSubmit = useCallback(
      (message: { text: string }, event: FormEvent<HTMLFormElement>) => {
        onComposerSubmit?.(message, event);
        if (event.isDefaultPrevented()) return;

        /* send(message.text) */
      },
      [onComposerSubmit]
    );

    return (
      <TooltipProvider>
        <ComposerPrimitive.Form
          className={classNames(
            "lb-root lb-chat-composer lb-chat-composer-form",
            className
          )}
          dir={$.dir}
          {...props}
          disabled={disabled}
          ref={forwardedRef}
          onComposerSubmit={handleComposerSubmit}
        >
          <div className="lb-chat-composer-editor-container">
            <ComposerPrimitive.Editor
              autoFocus
              className="lb-chat-composer-editor"
              placeholder={$.CHAT_COMPOSER_PLACEHOLDER}
              defaultValue={defaultValue}
            />

            <Attachments />

            <div className="lb-chat-composer-footer">
              <div className="lb-chat-composer-editor-actions">
                <Tooltip content={$.CHAT_COMPOSER_ATTACH_FILES}>
                  <ComposerPrimitive.AttachFiles
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
                  </ComposerPrimitive.AttachFiles>
                </Tooltip>
              </div>

              <div className="lb-chat-composer-actions">
                <ShortcutTooltip
                  content={$.CHAT_COMPOSER_SEND}
                  shortcut="Enter"
                >
                  <ComposerPrimitive.Submit
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
                  </ComposerPrimitive.Submit>
                </ShortcutTooltip>
              </div>
            </div>
          </div>
        </ComposerPrimitive.Form>
      </TooltipProvider>
    );
  }
);

/* -------------------------------------------------------------------------------------------------
 * Attachments
 * -----------------------------------------------------------------------------------------------*/
type AttachmentsProps = HTMLAttributes<HTMLDivElement>;

export const Attachments = forwardRef<HTMLDivElement, AttachmentsProps>(
  ({ className, ...props }, forwardedRef) => {
    const context = useContext(ComposerPrimitive.ComposerContext);
    if (context === null) {
      throw new Error("Attachments must be a descendant of Form.");
    }

    const { attachments } = context;
    if (attachments.length === 0) {
      return null;
    }

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
    file: File;
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
  if (!props.file.type.startsWith("image/")) {
    throw new Error("Only image attachments are supported.");
  }

  const context = useContext(ComposerPrimitive.ComposerContext);
  if (context === null) {
    throw new Error("Attachment must be a descendant of Form.");
  }

  const { onRemoveAttachment } = context;

  const { base, extension } = splitFileName(props.file.name);
  const $ = useOverrides();

  let description: string;
  if (props.status === "error") {
    if (props.error instanceof AttachmentTooLargeError) {
      description = $.ATTACHMENT_TOO_LARGE(
        ComposerPrimitive.MAX_ATTACHMENT_SIZE
          ? formatFileSize(ComposerPrimitive.MAX_ATTACHMENT_SIZE, $.locale)
          : undefined
      );
    } else {
      description = $.ATTACHMENT_ERROR(props.error);
    }
  } else {
    description = formatFileSize(props.file.size, $.locale);
  }

  return (
    <div
      className="lb-attachment lb-file-attachment lb-chat-composer-attachment"
      data-error={props.status === "error" ? "" : undefined}
    >
      <div className="lb-attachment-preview">
        {props.status === "uploading" ? (
          <SpinnerIcon />
        ) : props.status === "error" ? (
          <WarningIcon />
        ) : (
          <ImageAttachmentPreview {...props} />
        )}
      </div>

      <div className="lb-attachment-details">
        <span className="lb-attachment-name" title={props.file.name}>
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
          onPointerDown={(event) => event.preventDefault()}
          aria-label={$.CHAT_COMPOSER_REMOVE_ATTACHMENT}
        >
          <CrossIcon />
        </button>
      </Tooltip>
    </div>
  );
}

const MAX_DISPLAYED_MEDIA_SIZE = 60 * 1024 * 1024; // 60 MB

function ImageAttachmentPreview({ id, file }: { id: string; file: File }) {
  const [isUnsupportedPreview, setUnsupportedPreview] = useState(false);
  const { url } = useAttachmentUrl(id);
  const [isLoaded, setLoaded] = useState(false);

  if (!isLoaded) {
    return <SpinnerIcon />;
  }

  if (!isUnsupportedPreview && file.size <= MAX_DISPLAYED_MEDIA_SIZE) {
    return (
      <div className="lb-attachment-preview-media">
        <img
          src={url}
          loading="lazy"
          onLoad={() => setLoaded(true)}
          onError={() => setUnsupportedPreview(true)}
        />
      </div>
    );
  }

  return (
    <svg
      className="lb-attachment-icon"
      width={30}
      height={30}
      viewBox="0 0 30 30"
      fill="currentColor"
      fillRule="evenodd"
      clipRule="evenodd"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M6 5a2 2 0 0 1 2-2h5.843a4 4 0 0 1 2.829 1.172l6.156 6.156A4 4 0 0 1 24 13.157V25a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V5Z"
        className="lb-attachment-icon-shadow"
      />
      <path
        d="M6 5a2 2 0 0 1 2-2h5.843a4 4 0 0 1 2.829 1.172l6.156 6.156A4 4 0 0 1 24 13.157V25a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V5Z"
        className="lb-attachment-icon-background"
      />
      <path
        d="M14.382 3.037a4 4 0 0 1 2.29 1.135l6.156 6.157a4 4 0 0 1 1.136 2.289A2 2 0 0 0 22 11h-4a2 2 0 0 1-2-2V5a2 2 0 0 0-1.618-1.963Z"
        className="lb-attachment-icon-fold"
      />

      <g className="lb-attachment-icon-glyph">
        <path d="M12 16h6a1 1 0 0 1 1 1v3l-1.293-1.293a1 1 0 0 0-1.414 0L14.09 20.91l-.464-.386a1 1 0 0 0-1.265-.013l-1.231.985A.995.995 0 0 1 11 21v-4a1 1 0 0 1 1-1Zm-2 1a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2h-6a2 2 0 0 1-2-2v-4Zm3 2a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" />
      </g>
    </svg>
  );
}

function splitFileName(name: string) {
  const match = name.match(/^(.+?)(\.[^.]+)?$/);
  return { base: match?.[1] ?? name, extension: match?.[2] };
}

function useAttachmentUrl(attachmentId: string): AsyncResult<string, "url"> {
  const client = useClient();
  const store = client[kInternal].httpClient.userAttachmentUrlsBatchStore;

  const getAttachmentUrlState = useCallback(
    () => store.getItemState(attachmentId),
    [store, attachmentId]
  );

  useEffect(() => {
    void store.enqueue(attachmentId);
  }, [store, attachmentId]);

  return useSyncExternalStoreWithSelector(
    store.subscribe,
    getAttachmentUrlState,
    getAttachmentUrlState,
    selectorFor_useAttachmentUrl,
    shallow
  );
}

function selectorFor_useAttachmentUrl(
  state: AsyncResult<string | undefined> | undefined
): AsyncResult<string, "url"> {
  if (state === undefined || state?.isLoading) {
    return state ?? { isLoading: true };
  }

  if (state.error) {
    return state;
  }

  // For now `useAttachmentUrl` doesn't support a custom resolver so this case
  // will never happen as `getAttachmentUrl` will either return a URL or throw.
  // But we might decide to offer a custom resolver in the future to allow
  // self-hosting attachments.
  assert(state.data !== undefined, "Unexpected missing attachment URL");

  return {
    isLoading: false,
    url: state.data,
  };
}
