import type { AiAssistantMessage, ChatId, MessageId } from "@liveblocks/core";
import { useClient } from "@liveblocks/react";
import {
  type ButtonHTMLAttributes,
  forwardRef,
  type HTMLAttributes,
  memo,
  useState,
} from "react";

import { Tooltip, TooltipProvider } from "../../_private";
import { ChevronDownIcon, ChevronRightIcon, UndoIcon } from "../../icons";
import { WarningIcon } from "../../icons/Warning";
import {
  type ChatMessageOverrides,
  type GlobalOverrides,
  useOverrides,
} from "../../overrides";
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
  overrides?: Partial<GlobalOverrides & ChatMessageOverrides>;
};

export const AssistantChatMessage = memo(
  forwardRef<HTMLDivElement, AssistantChatMessageProps>(
    ({ message, className, overrides, ...props }, forwardedRef) => {
      const $ = useOverrides(overrides);
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
              {$.CHAT_MESSAGE_DELETED}
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
                {$.CHAT_MESSAGE_THINKING}
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
                components={{
                  TextPart,
                  ReasoningPart,
                }}
              />
            </div>
          );
        }
      } else if (message.status === "completed") {
        return (
          <TooltipProvider>
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
              <div className="lb-assistant-chat-message-actions">
                {/* <Tooltip content={$.CHAT_MESSAGE_COPY}>
                  <button
                    className="lb-button"
                    aria-label={$.CHAT_MESSAGE_COPY}
                  >
                  </button>
                </Tooltip> */}

                <Tooltip content={$.CHAT_MESSAGE_REGENERATE}>
                  <RegenerateMessageButton
                    chatId={message.chatId}
                    messageId={message.id}
                    className="lb-button"
                    aria-label={$.CHAT_MESSAGE_REGENERATE}
                  >
                    <UndoIcon />
                  </RegenerateMessageButton>
                </Tooltip>
              </div>
            </div>
          </TooltipProvider>
        );
      } else if (message.status === "failed") {
        return (
          <TooltipProvider>
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

              <div className="lb-assistant-chat-message-actions">
                <Tooltip content={$.CHAT_MESSAGE_REGENERATE}>
                  <RegenerateMessageButton
                    chatId={message.chatId}
                    messageId={message.id}
                    className="lb-button"
                    aria-label={$.CHAT_MESSAGE_REGENERATE}
                  >
                    <UndoIcon />
                  </RegenerateMessageButton>
                </Tooltip>
              </div>
            </div>
          </TooltipProvider>
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

export const RegenerateMessageButton = forwardRef<
  HTMLButtonElement,
  ButtonHTMLAttributes<HTMLButtonElement> & {
    chatId: ChatId;
    messageId: MessageId;
  }
>(({ chatId, messageId, onClick, disabled, ...props }, forwardedRef) => {
  const client = useClient();

  return (
    <button
      type="button"
      {...props}
      onClick={function (event) {
        if (disabled) return;
        onClick?.(event);
        if (event.defaultPrevented) return;
        client.ai.regenerateMessage(chatId, messageId, { stream: true });
      }}
      ref={forwardedRef}
    />
  );
});
