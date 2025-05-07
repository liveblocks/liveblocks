import type { UiUserMessage } from "@liveblocks/core";
import type { ComponentProps } from "react";
import { forwardRef, memo } from "react";

import type { GlobalOverrides } from "../../overrides";
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
    ({ message, className }, forwardedRef) => {
      const text = message.content
        .filter((c) => c.type === "text")
        .map((c) => c.text)
        .join("\n");

      if (message.deletedAt !== undefined) {
        return (
          <div
            ref={forwardedRef}
            className={classNames("lb-ai-chat-user-message", className)}
          >
            <div className="lb-ai-chat-user-message-deleted">
              This message has been deleted.
            </div>
          </div>
        );
      }

      return (
        <div
          ref={forwardedRef}
          className={classNames("lb-ai-chat-user-message", className)}
        >
          <div className="lb-ai-chat-user-message-content">
            <div className="lb-ai-chat-user-message-body">{text}</div>
          </div>
        </div>
      );
    }
  )
);
