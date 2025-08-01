import type {
  AiTextPart,
  AiUserMessage,
  WithNavigation,
} from "@liveblocks/core";
import type { ComponentProps } from "react";
import { forwardRef, memo } from "react";

import { AiMessage } from "../../_private";
import { type GlobalOverrides, useOverrides } from "../../overrides";
import { cn } from "../../utils/cn";

type UiUserMessage = WithNavigation<AiUserMessage>;

/* -------------------------------------------------------------------------------------------------
 * AiChatUserMessage
 * -----------------------------------------------------------------------------------------------*/
export interface AiChatUserMessageProps extends ComponentProps<"div"> {
  /**
   * The message to display.
   */
  message: UiUserMessage;
  /**
   * Override the component's strings.
   */
  overrides?: Partial<GlobalOverrides>;
}

type PlainTextPartProps = {
  part: AiTextPart;
};

function PlainTextPart({ part }: PlainTextPartProps) {
  return <p>{part.text}</p>;
}

export const AiChatUserMessage = memo(
  forwardRef<HTMLDivElement, AiChatUserMessageProps>(
    ({ message, className, overrides, ...props }, forwardedRef) => {
      const $ = useOverrides(overrides);
      return (
        <div
          ref={forwardedRef}
          className={cn(
            "lb-ai-chat-message lb-ai-chat-user-message",
            className
          )}
          {...props}
        >
          {message.deletedAt !== undefined ? (
            <div className="lb-ai-chat-message-deleted">
              {$.AI_CHAT_MESSAGE_DELETED}
            </div>
          ) : (
            <div className="lb-ai-chat-message-content">
              <AiMessage.Content
                message={message}
                parts={{
                  Text: PlainTextPart,
                }}
                className="lb-prose lb-ai-chat-message-text"
              />
            </div>
          )}
        </div>
      );
    }
  )
);
