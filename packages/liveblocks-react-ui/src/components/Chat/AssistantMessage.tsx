import type { AiAssistantMessage } from "@liveblocks/core";
import { forwardRef, type HTMLAttributes, memo, useState } from "react";

import { ChevronDownIcon, ChevronRightIcon } from "../../icons";
import { WarningIcon } from "../../icons/Warning";
import type { GlobalOverrides } from "../../overrides";
import {
  AssistantMessageContent,
  type AssistantMessageReasoningPartProps,
  type AssistantMessageTextPartProps,
  DefaultAssistantMessageTextPart,
} from "../../primitives/Chat/AssistantMessage";
import * as CollapsiblePrimitive from "../../primitives/Chat/AssistantMessage/Collapsible";
import { classNames } from "../../utils/class-names";

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
};

export const AssistantChatMessage = memo(
  forwardRef<HTMLDivElement, AssistantChatMessageProps>(
    ({ message, className, ...props }, forwardedRef) => {
      if (message.deletedAt !== undefined) {
        return (
          <div
            className={classNames(
              "lb-root lb-assistant-chat-message",
              className
            )}
            {...props}
            ref={forwardedRef}
          >
            <div className="lb-assistant-chat-message-deleted">
              This message has been deleted.
            </div>
          </div>
        );
      } else if (message.status === "pending") {
        if (message.contentSoFar.length === 0) {
          return (
            <div
              className={classNames(
                "lb-root lb-assistant-chat-message",
                className
              )}
              {...props}
              ref={forwardedRef}
            >
              <div className="lb-assistant-chat-message-thinking">
                Thinking…
              </div>
            </div>
          );
        } else {
          return (
            <div
              className={classNames(
                "lb-root lb-assistant-chat-message",
                className
              )}
              {...props}
              ref={forwardedRef}
            >
              <AssistantMessageContent
                content={message.contentSoFar}
                chatId={message.chatId}
                className="lb-assistant-chat-message-content"
              />
            </div>
          );
        }
      } else if (message.status === "completed") {
        return (
          <div
            className={classNames(
              "lb-root lb-assistant-chat-message",
              className
            )}
            {...props}
            ref={forwardedRef}
          >
            <AssistantMessageContent
              content={message.content}
              chatId={message.chatId}
              className="lb-assistant-chat-message-content"
              components={{
                TextPart,
                ReasoningPart,
              }}
            />
          </div>
        );
      } else if (message.status === "failed") {
        return (
          <div
            className={classNames(
              "lb-root lb-assistant-chat-message",
              className
            )}
            {...props}
            ref={forwardedRef}
          >
            <AssistantMessageContent
              content={message.contentSoFar}
              chatId={message.chatId}
              className="lb-assistant-chat-message-content"
              components={{
                TextPart,
                ReasoningPart,
              }}
            />
            <div className="lb-asssitant-chat-message-error">
              <span className="lb-icon-container">
                <WarningIcon />
              </span>

              {message.errorReason}
            </div>
          </div>
        );
      }
      return null;
    }
  )
);

function TextPart({ className, ...props }: AssistantMessageTextPartProps) {
  return (
    <DefaultAssistantMessageTextPart
      {...props}
      className={classNames("lb-assistant-chat-message-text-part", className)}
    />
  );
}

function ReasoningPart({
  text,
  className,
  ...props
}: AssistantMessageReasoningPartProps) {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <CollapsiblePrimitive.Root
      {...props}
      className={classNames(
        "lb-assistant-chat-message-reasoning-part",
        className
      )}
      open={isOpen}
      onOpenChange={setIsOpen}
    >
      <CollapsiblePrimitive.Trigger className="lb-assistant-chat-message-reasoning-part-trigger">
        Reasoning
        <span className="lb-icon-container">
          {isOpen ? <ChevronDownIcon /> : <ChevronRightIcon />}
        </span>
      </CollapsiblePrimitive.Trigger>

      <CollapsiblePrimitive.Content className="lb-assistant-chat-message-reasoning-part-content">
        {text}
      </CollapsiblePrimitive.Content>
    </CollapsiblePrimitive.Root>
  );
}
