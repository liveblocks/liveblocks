import type {
  AiAssistantMessage,
  AiPendingAssistantMessage,
  AiUserMessage,
  BranchEntry,
  ChatId,
} from "@liveblocks/core";
import { useClient } from "@liveblocks/react";
import { useSignal } from "@liveblocks/react/_private";
import { Fragment, type ComponentType, type HTMLAttributes } from "react";
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
  messages: readonly BranchEntry[];
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
        {messages.map(({ message, prev, next }) => (
          <Fragment key={message.id}>
            {prev || next ? (
              <div>
                <button
                  onClick={() => {
                    alert(`Implement this behavior! prev = ${prev}`);
                  }}
                  style={{
                    cursor: prev ? "pointer" : "not-allowed",
                    opacity: prev ? undefined : 0.5,
                  }}
                  disabled={!prev}
                >
                  Previous
                </button>
                <button
                  onClick={() => {
                    alert(`Implement this behavior! next = ${next}`);
                  }}
                  style={{
                    cursor: next ? "pointer" : "not-allowed",
                    opacity: next ? undefined : 0.5,
                  }}
                  disabled={!next}
                >
                  Next
                </button>
              </div>
            ) : null}

            {message.role === "user" ? (
              <UserChatMessage message={message} overrides={overrides} />
            ) : message.role === "assistant" ? (
              <AssistantChatMessage message={message} />
            ) : null}
          </Fragment>
        ))}
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
  message: AiUserMessage & { chatId: ChatId };
  /**
   * Override the component's strings.
   */
  overrides?: Partial<GlobalOverrides>;
};

export const DefaultUserChatMessage = forwardRef<
  HTMLDivElement,
  UserChatMessageProps
>(({ message, className }, forwardedRef) => {
  const text = message.deletedAt ? (
    <i>This message has been deleted.</i>
  ) : (
    message.content
      .filter((c) => c.type === "text")
      .map((c) => c.text)
      .join("\n")
  );

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
  message: AiAssistantMessage;
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
    TextPart: ComponentType<AssistantMessageTextPartProps>;
    /**
     * The component used to display tool call content in the assistant chat message.
     */
    // ToolCallPart: ComponentType<AssistantMessageToolCallPartProps>;
    /**
     * The component used to display reasoning content in the assistant chat message.
     */
    ReasoningPart: ComponentType<AssistantMessageReasoningPartProps>;
  }>;
};

export const DefaultAssistantChatMessage = forwardRef<
  HTMLDivElement,
  AssistantChatMessageProps
>((props, forwardedRef) => {
  return props.message.status === "pending" ? (
    <PendingDefaultAssistantChatMessage
      {...props}
      message={props.message}
      ref={forwardedRef}
    />
  ) : (
    <RealDefaultAssistantChatMessage {...props} ref={forwardedRef} />
  );
});

export type PendingAssistantChatMessageProps = Omit<
  AssistantChatMessageProps,
  "message"
> & { message: AiPendingAssistantMessage };

const PendingDefaultAssistantChatMessage = forwardRef<
  HTMLDivElement,
  PendingAssistantChatMessageProps
>((props, forwardedRef) => {
  const client = useClient();
  const pendingMessage = useSignal(
    client.ai.signals.pendingMessagesΣ,
    (lut) => lut[props.message.id]
  );
  const message = pendingMessage ?? props.message;
  return (
    <RealDefaultAssistantChatMessage
      {...props}
      message={message}
      ref={forwardedRef}
    />
  );
});

const RealDefaultAssistantChatMessage = forwardRef<
  HTMLDivElement,
  AssistantChatMessageProps
>(({ message, className, components, ...props }, forwardedRef) => {
  const client = useClient();
  const TextPart = components?.TextPart ?? DefaultAssistantMessageTextPart;

  const ReasoningPart =
    components?.ReasoningPart ?? DefaultAssistantMessageReasoningPart;

  const content = message.content ?? message.contentSoFar;

  function ToolCallPart({ name, args }: { name: string; args: any }) {
    const tool = client.ai.getToolCallDefinition(message.chatId, name);
    if (tool === undefined) return null;

    if (tool.render === undefined) return null;

    return <tool.render {...args} />;
  }

  return (
    <div
      ref={forwardedRef}
      className={classNames("lb-root lb-assistant-chat-message", className)}
      {...props}
    >
      {message.status !== "completed" ? (
        <div style={{ float: "right" }}>
          {message.status === "pending" ? (
            <i>Generating response...</i>
          ) : (
            <i style={{ color: "red" }}>{message.errorReason}</i>
          )}

          {message.status === "pending" ? (
            <button
              style={{
                all: "unset",
                cursor: "pointer",
                border: "1px solid red",
                padding: "8px 13px",
                color: "red",
              }}
              onClick={() => {
                void client.ai.abort(message.id);
              }}
            >
              Abort
            </button>
          ) : null}
        </div>
      ) : null}

      <div className="lb-assistant-chat-message-content">
        {message.deletedAt ? <i>This message has been deleted.</i> : null}
        {content.map((part, index) => {
          switch (part.type) {
            case "text":
              return <TextPart key={index} text={part.text} />;
            case "tool-call":
              return (
                <ToolCallPart
                  key={index}
                  name={part.toolName}
                  args={part.args}
                />
              );
            case "reasoning":
              return <ReasoningPart key={index} text={part.text} />;
          }
        })}
      </div>
    </div>
  );
});

export type AssistantMessageTextPartProps = HTMLAttributes<HTMLDivElement> & {
  text: string;
};

export const DefaultAssistantMessageTextPart = forwardRef<
  HTMLDivElement,
  AssistantMessageTextPartProps
>(({ text, className }, forwardedRef) => {
  return (
    <div
      ref={forwardedRef}
      className={classNames(
        "lb-root lb-assistant-chat-message-text-content",
        className
      )}
    >
      {text}
    </div>
  );
});

export type AssistantMessageReasoningPartProps =
  HTMLAttributes<HTMLDivElement> & { text: string };

export const DefaultAssistantMessageReasoningPart = forwardRef<
  HTMLDivElement,
  AssistantMessageReasoningPartProps
>(({ text, className }, forwardedRef) => {
  return (
    <div
      ref={forwardedRef}
      className={classNames(
        "lb-root lb-assistant-chat-message-reasoning-content",
        className
      )}
    >
      <details style={{ cursor: "pointer" }}>
        <summary>Reasoning...</summary>
        {text}
      </details>
    </div>
  );
});

export type AssistantMessageToolCallPartProps =
  HTMLAttributes<HTMLDivElement> & {
    toolName: string;
    toolCallId: string;
    args: unknown;
  };

export const DefaultAssistantMessageToolCallPart = forwardRef<
  HTMLDivElement,
  AssistantMessageToolCallPartProps
>(({ toolName, toolCallId, args, className }, forwardedRef) => {
  return (
    <div
      ref={forwardedRef}
      className={classNames(
        "lb-root lb-assistant-chat-message-tool-call-content",
        className
      )}
    >
      <span>
        {toolName} (#{toolCallId})
      </span>
      <pre style={{ overflow: "auto" }}>{JSON.stringify(args, null, 2)}</pre>
    </div>
  );
});
