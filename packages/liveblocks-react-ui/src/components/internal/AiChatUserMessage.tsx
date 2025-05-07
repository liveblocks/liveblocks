import type { UiUserMessage } from "@liveblocks/core";
import type { ComponentProps } from "react";
import { forwardRef, memo } from "react";

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

export const AiChatUserMessage = memo(
  forwardRef<HTMLDivElement, AiChatUserMessageProps>(
    ({ message, className, overrides }, forwardedRef) => {
      const $ = useOverrides(overrides);
      const paragraphs = message.content
        .filter((c) => c.type === "text")
        .map((c) => c.text);

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
                {/* Mimic the structure of assistant messages even though there's no rich text here yet. */}
                {paragraphs.map((text, index) => (
                  <p key={index}>{text}</p>
                ))}
              </div>
            )}
          </div>
          {/* <div className="lb-ai-chat-message-actions" /> */}
        </div>
      );
    }
  )
);
