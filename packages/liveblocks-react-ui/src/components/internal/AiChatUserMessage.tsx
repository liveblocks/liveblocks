import type { AiUserMessage, WithNavigation } from "@liveblocks/core";
import type { ComponentProps } from "react";
import { forwardRef, memo } from "react";

import type { GlobalComponents } from "../../components";
import { type GlobalOverrides, useOverrides } from "../../overrides";
import * as AiMessage from "../../primitives/AiMessage";
import type { AiMessageContentTextPartProps } from "../../primitives/AiMessage/types";
import type { MarkdownComponents } from "../../primitives/Markdown";
import { cn } from "../../utils/cn";
import { Prose } from "./Prose";

type UiUserMessage = WithNavigation<AiUserMessage>;

type AiChatUserMessageComponents = {
  /**
   * The components used to render Markdown content.
   */
  markdown?: Partial<MarkdownComponents>;
};

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

  /**
   * Override the component's components.
   */
  components?: Partial<GlobalComponents & AiChatUserMessageComponents>;
}

interface TextPartProps extends AiMessageContentTextPartProps {
  components?: Partial<GlobalComponents & AiChatUserMessageComponents>;
}

function TextPart({ part, components }: TextPartProps) {
  return (
    <Prose
      content={part.text}
      className="lb-ai-chat-message-text"
      components={components}
    />
  );
}

export const AiChatUserMessage = memo(
  forwardRef<HTMLDivElement, AiChatUserMessageProps>(
    ({ message, className, overrides, components, ...props }, forwardedRef) => {
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
            <AiMessage.Content
              className="lb-ai-chat-message-content"
              message={message}
              components={{
                TextPart: (props) => (
                  <TextPart {...props} components={components} />
                ),
              }}
            />
          )}
        </div>
      );
    }
  )
);
