import { CopilotChatMessage } from "@liveblocks/core";
import { useAttachmentUrl } from "@liveblocks/react";
import { HTMLAttributes, forwardRef, useState } from "react";
/* -------------------------------------------------------------------------------------------------
 * ChatMessages
 * -----------------------------------------------------------------------------------------------*/
export type ChatMessagesProps = Omit<
  HTMLAttributes<HTMLDivElement>,
  "children"
> & {
  messages: CopilotChatMessage[];
};

export const ChatMessages = forwardRef<HTMLDivElement, ChatMessagesProps>(
  ({ messages, className }, forwardedRef) => {
    return (
      <div
        ref={forwardedRef}
        className={classNames("lb-root lb-chat-messages", className)}
      >
        {messages.map((message) => {
          if (message.role === "user") {
            return (
              <UserChatMessage
                key={message.id}
                id={message.id}
                content={message.content}
              />
            );
          } else if (message.role === "assistant") {
            return (
              <AssistantChatMessage
                key={message.id}
                content={message.content}
              />
            );
          }
        })}
      </div>
    );
  }
);

/* -------------------------------------------------------------------------------------------------
 * UserChatMessage
 * -----------------------------------------------------------------------------------------------*/
export type UserChatMessageProps = Omit<
  HTMLAttributes<HTMLDivElement>,
  "content"
> & {
  id: string;
  content: Extract<CopilotChatMessage, { role: "user" }>["content"];
};

export const UserChatMessage = forwardRef<HTMLDivElement, UserChatMessageProps>(
  ({ id, content, className }, forwardedRef) => {
    const text = content
      .filter((block) => block.type === "text")
      .map((block) => block.text)
      .join("\n");

    return (
      <div
        ref={forwardedRef}
        className={classNames("lb-root lb-user-chat-message", className)}
      >
        <div className="lb-user-chat-message-content">
          <UserChatMessageBody
            text={text}
            className="lb-user-chat-message-body"
          />
        </div>
      </div>
    );
  }
);

/* -------------------------------------------------------------------------------------------------
 * UserChatMessageBody
 * -----------------------------------------------------------------------------------------------*/
type UserChatMessageBodyProps = HTMLAttributes<HTMLDivElement> & {
  text: string;
};
export const UserChatMessageBody = forwardRef<
  HTMLDivElement,
  UserChatMessageBodyProps
>(({ text, ...props }, forwardedRef) => {
  return (
    <div {...props} ref={forwardedRef}>
      {text}
    </div>
  );
});

/* -------------------------------------------------------------------------------------------------
 * UserChatMessageMediaAttachment
 * -----------------------------------------------------------------------------------------------*/
type UserChatMessageMediaAttachmentProps = HTMLAttributes<HTMLDivElement> & {
  attachmentId: string;
};
export const UserChatMessageMediaAttachment = forwardRef<
  HTMLDivElement,
  UserChatMessageMediaAttachmentProps
>(({ attachmentId, ...props }, forwardedRef) => {
  const { url } = useAttachmentUrl(attachmentId);
  const [isLoaded, setLoaded] = useState(false);

  return (
    <div className="lb-attachment-preview" {...props}>
      {!isLoaded ? (
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
      ) : null}
      {url ? (
        <div
          className="lb-attachment-preview-media"
          data-hidden={!isLoaded ? "" : undefined}
        >
          <img src={url} loading="lazy" onLoad={() => setLoaded(true)} />
        </div>
      ) : null}
    </div>
  );
});

/* -------------------------------------------------------------------------------------------------
 * AssistantChatMessage
 * -----------------------------------------------------------------------------------------------*/
export type AssistantChatMessageProps = Omit<
  HTMLAttributes<HTMLDivElement>,
  "content"
> & {
  content: Extract<CopilotChatMessage, { role: "assistant" }>["content"];
};

export const AssistantChatMessage = forwardRef<
  HTMLDivElement,
  AssistantChatMessageProps
>(({ content, className }, forwardedRef) => {
  return (
    <div
      ref={forwardedRef}
      className={classNames("lb-root lb-assistant-chat-message", className)}
    >
      <div className="lb-assistant-chat-message-content">
        {content.map((block, index) => {
          switch (block.type) {
            case "text":
              return (
                <div key={index} className="lb-assistant-chat-message-body">
                  {block.text}
                </div>
              );
          }
        })}
      </div>
    </div>
  );
});

/* -------------------------------------------------------------------------------------------------
 * MediaAttachment
 * -----------------------------------------------------------------------------------------------*/
export function MediaAttachment({}: { attachment: { id: string } }) {}

function classNames(...args: (string | number | boolean | undefined | null)[]) {
  return args
    .filter((arg) => typeof arg === "string" || typeof arg === "number")
    .join(" ");
}
