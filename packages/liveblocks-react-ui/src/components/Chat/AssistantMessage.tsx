import type {
  AiAssistantContentPart,
  AiAssistantMessage,
  ChatId,
  MessageId,
} from "@liveblocks/core";
import { useClient } from "@liveblocks/react";
import { useSignal } from "@liveblocks/react/_private";
import { Lexer } from "marked";
import {
  forwardRef,
  type HTMLAttributes,
  memo,
  useEffect,
  useMemo,
  useState,
} from "react";

import { Tooltip, TooltipProvider } from "../../_private";
import { CheckIcon, ChevronDownIcon, ChevronRightIcon } from "../../icons";
import { CopyIcon } from "../../icons/Copy";
import { WarningIcon } from "../../icons/Warning";
import {
  type ChatMessageOverrides,
  type GlobalOverrides,
  useOverrides,
} from "../../overrides";
import * as CollapsiblePrimitive from "../../primitives/internal/Collapsible";
import {
  type BlockToken,
  BlockTokenComp as BlockTokenCompPrimitive,
} from "../../primitives/internal/Markdown";
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
              />
            </div>
          );
        }
      } else if (message.status === "completed") {
        const text: string = message.content.reduce((acc, part) => {
          if (part.type === "text") {
            return acc + part.text;
          }
          return acc;
        }, "");

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
              {/* {message.id === ("ms_xxah19VYAKCa2woLgwTK2" as MessageId) && (
                <ReasoningPart
                  isPending={true}
                  text="Yes, you could use a max-heap, keyed by timestamps, for tracking the latest non-deleted leaf in a chat tree. When inserting, you'd push new leaf nodes. Once a message has children, it's no longer a leaf and should be updated. For deletion, typical heaps can't easily remove arbitrary elements, so you could either use lazy deletion (marking the entries as invalid) or maintain pointers to nodes that need updating. Handling priority updates will require careful management of heap structure."
                />
              )} */}
              <AssistantMessageContent
                content={message.content}
                chatId={message.chatId}
              />
              <div className="lb-assistant-chat-message-actions">
                <Tooltip content={$.CHAT_MESSAGE_COPY}>
                  <CopyTextButton text={text} label={$.CHAT_MESSAGE_COPY} />
                </Tooltip>

                <Tooltip content={$.CHAT_MESSAGE_REGENERATE}>
                  <RegenerateMessageButton
                    chatId={message.chatId}
                    messageId={message.id}
                    label={$.CHAT_MESSAGE_REGENERATE}
                  />
                </Tooltip>
              </div>
            </div>
          </TooltipProvider>
        );
      } else if (message.status === "failed") {
        const text: string = message.contentSoFar.reduce((acc, part) => {
          if (part.type === "text") {
            return acc + part.text;
          }
          return acc;
        }, "");

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
              />

              <div className="lb-asssitant-chat-message-error">
                <span className="lb-icon-container">
                  <WarningIcon />
                </span>

                {message.errorReason}
              </div>

              <div className="lb-assistant-chat-message-actions">
                <Tooltip content={$.CHAT_MESSAGE_COPY}>
                  <CopyTextButton text={text} label={$.CHAT_MESSAGE_COPY} />
                </Tooltip>

                <Tooltip content={$.CHAT_MESSAGE_REGENERATE}>
                  <RegenerateMessageButton
                    chatId={message.chatId}
                    messageId={message.id}
                    label={$.CHAT_MESSAGE_REGENERATE}
                  />
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

function CopyTextButton({ text, label }: { text: string; label: string }) {
  const [isCopied, setIsCopied] = useState(false);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setIsCopied(false);
    }, 2000);
    return () => {
      clearTimeout(timeoutId);
    };
  }, [isCopied]);

  return (
    <button
      type="button"
      onClick={function () {
        navigator.clipboard.writeText(text);
        setIsCopied(true);
      }}
      data-variant="default"
      className="lb-button lb-assistant-chat-message-copy-button"
      aria-label={label}
    >
      <span className="lb-icon-container">
        {isCopied ? <CheckIcon /> : <CopyIcon />}
      </span>
    </button>
  );
}

function RegenerateMessageButton({
  chatId,
  messageId,
  label,
}: {
  chatId: ChatId;
  messageId: MessageId;
  label: string;
}) {
  const client = useClient();

  return (
    <button
      type="button"
      onClick={function () {
        client.ai.regenerateMessage(chatId, messageId, { stream: true });
      }}
      data-variant="default"
      className="lb-button lb-assistant-chat-message-regenerate-button"
      aria-label={label}
    >
      <span className="lb-icon-container">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="20"
          height="20"
          viewBox="0 0 20 20"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="lb-icon"
        >
          <path d="M4 10 a6 6 0 0 1 6 -6 a6.5 6.5 0 0 1 4.49 1.83 L16 7.33" />
          <path d="M16 4 v3.33 h-3.33" />
          <path d="M16 10 a6 6 0 0 1 -6 6 a6.5 6.5 0 0 1 -4.49 -1.83 L4 12.67" />
          <path d="M7.33 12.67 H4 v3.33" />
        </svg>
      </span>
    </button>
  );
}

function AssistantMessageContent({
  content,
  chatId,
}: {
  content: AiAssistantContentPart[];
  chatId: ChatId;
}) {
  // A message is considered to be in "reasoning" state if it only contains reasoning parts and no other parts.
  const isReasoning =
    content.some((part) => part.type === "reasoning") &&
    content.every((part) => part.type === "reasoning");

  return (
    <div className="lb-assistant-chat-message-content">
      {content.map((part, index) => {
        switch (part.type) {
          case "text": {
            return (
              <TextPart
                key={index}
                text={part.text}
                className="lb-assistant-chat-message-text-part"
              />
            );
          }
          case "tool-call": {
            return (
              <ToolCallPart
                key={index}
                chatId={chatId}
                name={part.toolName}
                args={part.args}
              />
            );
          }
          case "reasoning": {
            return (
              <ReasoningPart
                key={index}
                text={part.text}
                isPending={isReasoning}
              />
            );
          }
          default: {
            return null;
          }
        }
      })}
    </div>
  );
}

/* -------------------------------------------------------------------------------------------------
 * TextPart
 * -----------------------------------------------------------------------------------------------*/
type TextPartProps = HTMLAttributes<HTMLDivElement> & {
  text: string;
};

const TextPart = forwardRef<HTMLDivElement, TextPartProps>(
  ({ text, ...props }, forwardedRef) => {
    const tokens = useMemo(() => {
      return new Lexer().lex(text);
    }, [text]);

    return (
      <div ref={forwardedRef} {...props}>
        {tokens.map((token, index) => {
          return (
            <MemoizedBlockTokenComp token={token as BlockToken} key={index} />
          );
        })}
      </div>
    );
  }
);

const MemoizedBlockTokenComp = memo(
  function BlockTokenComp({ token }: { token: BlockToken }) {
    return <BlockTokenCompPrimitive token={token} />;
  },
  (prevProps, nextProps) => {
    const prevToken = prevProps.token;
    const nextToken = nextProps.token;
    if (prevToken.raw.length !== nextToken.raw.length) {
      return false;
    }
    if (prevToken.type !== nextToken.type) {
      return false;
    }
    return prevToken.raw === nextToken.raw;
  }
);

/* -------------------------------------------------------------------------------------------------
 * ToolCallPart
 * -----------------------------------------------------------------------------------------------*/
function ToolCallPart({
  chatId,
  name,
  args,
}: {
  chatId: ChatId;
  name: string;
  args: any;
}) {
  const client = useClient();

  const tool = useSignal(client.ai.signals.getToolDefinitionΣ(chatId, name));
  if (tool === undefined || tool.render === undefined) return null;

  return <tool.render args={args as unknown} />;
}

/* -------------------------------------------------------------------------------------------------
 * ReasoningPart
 * -----------------------------------------------------------------------------------------------*/
function ReasoningPart({
  text,
  isPending,
}: {
  text: string;
  isPending: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <CollapsiblePrimitive.Root
      className="lb-assistant-chat-message-reasoning-part"
      open={isOpen}
      onOpenChange={setIsOpen}
    >
      <CollapsiblePrimitive.Trigger
        className="lb-assistant-chat-message-reasoning-part-trigger"
        data-reasoning={isPending ? "" : undefined}
      >
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
