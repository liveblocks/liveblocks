import { HTMLAttributes, forwardRef } from "react";
/* -------------------------------------------------------------------------------------------------
 * ChatMessages
 * -----------------------------------------------------------------------------------------------*/
export type ChatMessagesProps = Omit<
  HTMLAttributes<HTMLDivElement>,
  "children"
> & {
  messages: (
    | { role: "user"; id: string; content: { text: string } }
    | {
        role: "assistant";
        id: string;
        content: (
          | { id: string; type: "text"; data: string }
          | { type: "tool-call"; id: string; name: string; arguments: unknown }
        )[];
      }
  )[];
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
              <UserChatMessage key={message.id} content={message.content} />
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
  content: {
    text: string;
    media?: { id: string }[];
    files?: { id: string }[];
  };
};

export const UserChatMessage = forwardRef<HTMLDivElement, UserChatMessageProps>(
  ({ content, className }, forwardedRef) => {
    const { text, media = [], files = [] } = content;
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

          <div className="lb-user-chat-message-attachments">
            {/* Media attachments */}
            {media.length > 0 && (
              <div className="lb-attachments">
                {media.map((media) => (
                  <UserChatMessageMediaAttachment
                    key={media.id}
                    attachment={media}
                    className="lb-user-chat-message-attachment lb-attachment lb-media-attachment"
                  />
                ))}
              </div>
            )}

            {/* File attachments */}
            {files.length > 0 && (
              <div className="lb-attachments">
                {media.map((media) => (
                  <UserChatMessageMediaAttachment
                    key={media.id}
                    attachment={media}
                    className="lb-user-chat-message-attachment lb-attachment lb-media-attachment"
                  />
                ))}
              </div>
            )}
          </div>
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
  attachment: { id: string };
};
export const UserChatMessageMediaAttachment = forwardRef<
  HTMLDivElement,
  UserChatMessageMediaAttachmentProps
>(({ attachment, ...props }, forwardedRef) => {
  return (
    <div {...props} ref={forwardedRef}>
      <span>{attachment.id}</span>
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
  content: (
    | { id: string; type: "text"; data: string }
    | { id: string; type: "tool-call"; name: string }
  )[];
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
        {content.map((block) => {
          switch (block.type) {
            case "text":
              return (
                <div key={block.id} className="lb-assistant-chat-message-body">
                  {block.data}
                </div>
              );
            case "tool-call":
              return (
                <div
                  key={block.id}
                  className="lb-assistant-chat-message-tool-call"
                >
                  {block.name}
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
