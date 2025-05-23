import type { AiTextPart, UiUserMessage } from "@liveblocks/core";
import type { ComponentProps } from "react";
import { forwardRef, memo } from "react";

import { AiMessage } from "../../_private";
import { type GlobalOverrides, useOverrides } from "../../overrides";
import { classNames } from "../../utils/class-names";

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
    ({ message, className, overrides }, forwardedRef) => {
      const $ = useOverrides(overrides);
      return (
        <div
          ref={forwardedRef}
          className={classNames(
            "lb-ai-chat-message lb-ai-chat-user-message",
            className
          )}
        >
          <div className="lb-ai-chat-message-content">
            {message.deletedAt !== undefined ? (
              <div className="lb-ai-chat-message-deleted">
                {$.AI_CHAT_MESSAGE_DELETED}
              </div>
            ) : (
              <div className="lb-ai-chat-message-text">
                <AiMessage.Content
                  message={message}
                  components={{
                    TextPart: PlainTextPart,
                  }}
                />
              </div>
            )}
          </div>
          {/* <div className="lb-ai-chat-message-actions" /> */}
        </div>
      );
    }
  )
);
