import type { ChatId, MessageId } from "@liveblocks/core";
import type { ComponentType, HTMLAttributes } from "react";
import { forwardRef, useState } from "react";

import { SpinnerIcon } from "../../icons";
import type { GlobalOverrides } from "../../overrides";
import { useOverrides } from "../../overrides";
import { classNames } from "../../utils/class-names";
import { formatFileSize } from "../../utils/format-file-size";
import {
  MAX_DISPLAYED_MEDIA_SIZE,
  splitFileName,
  useChatAttachmentUrl,
} from "./Composer";

/* -------------------------------------------------------------------------------------------------
 * ChatMessages
 * -----------------------------------------------------------------------------------------------*/
export type ChatMessagesProps = Omit<
  HTMLAttributes<HTMLDivElement>,
  "children"
> & {
  /**
   * The messages to display.
   */
  messages: (
    | {
        role: "user";
        id: MessageId;
        chatId: ChatId;
        content: (
          | { type: "text"; data: string }
          | {
              type: "image";
              id: string;
              name: string;
              size: number;
              mimeType: string;
            }
        )[];
      }
    | {
        role: "assistant";
        id: MessageId;
        chatId: ChatId;
        content: (
          | { type: "text"; id: string; data: string }
          | {
              type: "tool-call";
              id: string;
              name: string;
              args?: unknown;
            }
        )[];
      }
  )[];
  /**
   * The components displayed in the chat messages.
   */
  components?: Partial<{
    /**
     * The component used to display user chat messages.
     */
    UserChatMessage: ComponentType<UserChatMessageProps>;
    /**
     * The component used to display assistant chat messages.
     */
    AssistantChatMessage: ComponentType<AssistantChatMessageProps>;
  }>;
  /**
   * Override the component's strings.
   */
  overrides?: Partial<GlobalOverrides>;
};

export const ChatMessages = forwardRef<HTMLDivElement, ChatMessagesProps>(
  ({ messages, className, components, overrides, ...props }, forwardedRef) => {
    const UserChatMessage =
      components?.UserChatMessage ?? DefaultUserChatMessage;
    const AssistantChatMessage =
      components?.AssistantChatMessage ?? DefaultAssistantChatMessage;

    return (
      <div
        ref={forwardedRef}
        className={classNames("lb-root lb-chat-messages", className)}
        {...props}
      >
        {messages.map((message) => {
          if (message.role === "user") {
            return (
              <UserChatMessage
                key={message.id}
                message={message}
                overrides={overrides}
              />
            );
          } else if (message.role === "assistant") {
            return <AssistantChatMessage key={message.id} message={message} />;
          }

          return null;
        })}
      </div>
    );
  }
);

/* -------------------------------------------------------------------------------------------------
 * UserChatMessage
 * -----------------------------------------------------------------------------------------------*/
export type UserChatMessageProps = HTMLAttributes<HTMLDivElement> & {
  /**
   * The message to display.
   */
  message: {
    /**
     * The id of the message.
     */
    id: string;
    /**
     * The id of the chat the message belongs to.
     */
    chatId: ChatId;
    /**
     * The content of the message (a list of text and media attachments).
     */
    content: (
      | {
          type: "text";
          data: string;
        }
      | {
          type: "image";
          id: string;
          name: string;
          size: number;
          mimeType: string;
        }
    )[];
  };
  /**
   * Override the component's strings.
   */
  overrides?: Partial<GlobalOverrides>;
};

export const DefaultUserChatMessage = forwardRef<
  HTMLDivElement,
  UserChatMessageProps
>(({ message, className }, forwardedRef) => {
  const text = message.content
    .filter((c) => c.type === "text")
    .map((c) => c.data)
    .join("\n");

  const images = message.content.filter((c) => c.type === "image");

  return (
    <div
      ref={forwardedRef}
      className={classNames("lb-root lb-user-chat-message", className)}
    >
      {images.length > 0 && (
        <div className="lb-user-chat-message-attachments">
          <div className="lb-user-chat-message-media-attachments">
            {images.map((image) => (
              <UserChatMessageMediaAttachment
                key={image.id}
                chatId={message.chatId}
                attachment={image}
                className="lb-user-chat-message-attachment"
              />
            ))}
          </div>
        </div>
      )}

      <div className="lb-user-chat-message-content">
        <div className="lb-user-chat-message-body">{text}</div>
      </div>
    </div>
  );
});

type UserChatMessageMediaAttachmentProps = HTMLAttributes<HTMLDivElement> & {
  chatId: ChatId;
  attachment: {
    id: string;
    name: string;
    size: number;
    mimeType: string;
  };
  overrides?: Partial<GlobalOverrides>;
};

function UserChatMessageMediaAttachment({
  className,
  chatId,
  attachment,
  overrides,
  onClick,
  onKeyDown,
  ...props
}: UserChatMessageMediaAttachmentProps) {
  if (!attachment.mimeType.startsWith("image/")) {
    throw new Error("Only image attachments are supported.");
  }

  const { url } = useChatAttachmentUrl(chatId, attachment.id);

  const { base, extension } = splitFileName(attachment.name);
  const $ = useOverrides(overrides);
  const description = formatFileSize(attachment.size, $.locale);

  return (
    <div
      className={classNames(
        "lb-user-chat-message-attachment lb-attachment lb-media-attachment",
        className
      )}
      role={url !== undefined ? "button" : undefined}
      tabIndex={url !== undefined ? 0 : -1}
      onKeyDown={(event) => {
        onKeyDown?.(event);
        if (event.isDefaultPrevented()) return;

        if (url === undefined) return;
        if (event.key === "Enter" || event.key === " ") {
          window.open(url, "_blank");
        }
      }}
      {...props}
      onClick={(event) => {
        onClick?.(event);
        if (event.isDefaultPrevented()) return;

        if (url === undefined) return;
        window.open(url, "_blank");
      }}
    >
      <AttachmentPreview attachment={attachment} url={url} />

      <div className="lb-attachment-details">
        <span className="lb-attachment-name" title={attachment.name}>
          <span className="lb-attachment-name-base">{base}</span>
          {extension && (
            <span className="lb-attachment-name-extension">{extension}</span>
          )}
        </span>

        <span className="lb-attachment-description" title={description}>
          {description}
        </span>
      </div>
    </div>
  );
}

type AttachmentPreviewProps = HTMLAttributes<HTMLDivElement> & {
  attachment: { name: string; size: number };
  url: string | undefined;
};

function AttachmentPreview({
  attachment,
  url,
  ...props
}: AttachmentPreviewProps) {
  const [isUnsupportedPreview, setUnsupportedPreview] = useState(false);
  const [isLoaded, setLoaded] = useState(false);

  if (!isUnsupportedPreview && attachment.size <= MAX_DISPLAYED_MEDIA_SIZE) {
    return (
      <div className="lb-attachment-preview" {...props}>
        {!isLoaded ? <SpinnerIcon /> : null}

        {url ? (
          <div
            className="lb-attachment-preview-media"
            data-hidden={!isLoaded ? "" : undefined}
          >
            <img
              src={url}
              loading="lazy"
              onLoad={() => setLoaded(true)}
              onError={() => setUnsupportedPreview(true)}
            />
          </div>
        ) : null}
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

/* -------------------------------------------------------------------------------------------------
 * AssistantChatMessage
 * -----------------------------------------------------------------------------------------------*/
export type AssistantChatMessageProps = HTMLAttributes<HTMLDivElement> & {
  /**
   * The message to display.
   */
  message: {
    /**
     * The id of the message.
     */
    id: string;
    /**
     * The id of the chat the message belongs to.
     */
    chatId: string;
    /**
     * The content of the message (a list of text and media attachments).
     */
    content: (
      | {
          type: "text";
          id: string;
          data: string;
        }
      | {
          type: "tool-call";
          id: string;
          name: string;
          args?: unknown;
        }
    )[];
  };
  /**
   * Override the component's strings.
   */
  overrides?: Partial<GlobalOverrides>;
  /**
   * Override the component's components.
   */
  components?: Partial<{
    /**
     * The component used to display text content in the assistant chat message.
     */
    TextMessage: ComponentType<AssistantMessageTextContentProps>;
    /**
     * The component used to display tool call content in the assistant chat message.
     */
    ToolCallMessage: ComponentType<AssistantMessageToolCallContentProps>;
  }>;
};

export const DefaultAssistantChatMessage = forwardRef<
  HTMLDivElement,
  AssistantChatMessageProps
>(({ message, className, components, ...props }, forwardedRef) => {
  const TextMessage =
    components?.TextMessage ?? DefaultAssistantMessageTextContent;
  const ToolCallMessage =
    components?.ToolCallMessage ?? DefaultAssistantMessageToolCallContent;
  return (
    <div
      ref={forwardedRef}
      className={classNames("lb-root lb-assistant-chat-message", className)}
      {...props}
    >
      <div className="lb-assistant-chat-message-content">
        {message.content.map((block) => {
          switch (block.type) {
            case "text":
              return <TextMessage key={block.id} data={block.data} />;
            case "tool-call":
              return (
                <ToolCallMessage
                  key={block.id}
                  name={block.name}
                  args={block.args}
                />
              );
          }
        })}
      </div>
    </div>
  );
});

export type AssistantMessageTextContentProps =
  HTMLAttributes<HTMLDivElement> & {
    data: string;
  };
export const DefaultAssistantMessageTextContent = forwardRef<
  HTMLDivElement,
  AssistantMessageTextContentProps
>(({ data, className }, forwardedRef) => {
  return (
    <div
      ref={forwardedRef}
      className={classNames(
        "lb-root lb-assistant-chat-message-text-content",
        className
      )}
    >
      {data}
    </div>
  );
});

export type AssistantMessageToolCallContentProps =
  HTMLAttributes<HTMLDivElement> & {
    name: string;
    args?: unknown;
  };

export const DefaultAssistantMessageToolCallContent = forwardRef<
  HTMLDivElement,
  AssistantMessageToolCallContentProps
>(({ name, args, className }, forwardedRef) => {
  return (
    <div
      ref={forwardedRef}
      className={classNames(
        "lb-root lb-assistant-chat-message-tool-call-content",
        className
      )}
    >
      <span>{name}</span>
      <pre style={{ overflow: "auto" }}>{JSON.stringify(args, null, 2)}</pre>
    </div>
  );
});
