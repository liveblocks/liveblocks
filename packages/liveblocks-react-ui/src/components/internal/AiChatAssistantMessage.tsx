import {
  type AiAssistantContentPart,
  kInternal,
  type UiAssistantMessage,
} from "@liveblocks/core";
import { useClient } from "@liveblocks/react";
import { useSignal } from "@liveblocks/react/_private";
import { Lexer } from "marked";
import {
  type ComponentProps,
  forwardRef,
  memo,
  type ReactNode,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { Button } from "../../_private";
import { type GlobalComponents, useComponents } from "../../components";
import { CheckIcon } from "../../icons/Check";
import { ChevronRightIcon } from "../../icons/ChevronRight";
import { CopyIcon } from "../../icons/Copy";
import { WarningIcon } from "../../icons/Warning";
import {
  type AiChatMessageOverrides,
  type GlobalOverrides,
  useOverrides,
} from "../../overrides";
import * as CollapsiblePrimitive from "../../primitives/internal/Collapsible";
import {
  type BlockToken,
  BlockTokenComp as BlockTokenCompPrimitive,
  type MarkdownComponents,
} from "../../primitives/internal/Markdown";
import { classNames } from "../../utils/class-names";

/* -------------------------------------------------------------------------------------------------
 * AiChatAssistantMessage
 * -----------------------------------------------------------------------------------------------*/
export interface AiChatAssistantMessageProps extends ComponentProps<"div"> {
  /**
   * The message to display.
   */
  message: UiAssistantMessage;

  /**
   * Override the component's strings.
   */
  overrides?: Partial<GlobalOverrides & AiChatMessageOverrides>;

  /**
   * Override the component's components.
   */
  components?: Partial<GlobalComponents>;
}

export const AiChatAssistantMessage = memo(
  forwardRef<HTMLDivElement, AiChatAssistantMessageProps>(
    ({ message, className, overrides, components, ...props }, forwardedRef) => {
      const $ = useOverrides(overrides);

      let children: ReactNode = null;

      if (message.deletedAt !== undefined) {
        children = (
          <div className="lb-ai-chat-message-deleted">
            {$.AI_CHAT_MESSAGE_DELETED}
          </div>
        );
      } else if (message.status === "pending") {
        if (message.contentSoFar.length === 0) {
          children = (
            <div className="lb-ai-chat-message-thinking lb-ai-chat-pending">
              {$.AI_CHAT_MESSAGE_THINKING}
            </div>
          );
        } else {
          children = (
            <AssistantMessageContent
              content={message.contentSoFar}
              chatId={message.chatId}
              components={components}
            />
          );
        }
      } else if (message.status === "completed") {
        children = (
          <AssistantMessageContent
            content={message.content}
            chatId={message.chatId}
            components={components}
          />
        );
      } else if (message.status === "failed") {
        // Do not include the error message if the user aborted the request.
        if (message.errorReason === "Aborted by user") {
          children = (
            <AssistantMessageContent
              content={message.contentSoFar}
              chatId={message.chatId}
              components={components}
            />
          );
        } else {
          children = (
            <>
              <AssistantMessageContent
                content={message.contentSoFar}
                chatId={message.chatId}
                components={components}
              />

              <div className="lb-ai-chat-message-error">
                <span className="lb-icon-container">
                  <WarningIcon />
                </span>
                {message.errorReason}
              </div>
            </>
          );
        }
      }

      return (
        <div
          className={classNames(
            "lb-ai-chat-message lb-ai-chat-assistant-message",
            className
          )}
          {...props}
          ref={forwardedRef}
        >
          {children}
        </div>
      );
    }
  )
);

function AssistantMessageContent({
  content,
  chatId,
  components,
}: {
  content: AiAssistantContentPart[];
  chatId: string;
  components: Partial<GlobalComponents> | undefined;
}) {
  // A message is considered to be in "reasoning" state if it only contains reasoning parts and no other parts.
  const isReasoning =
    content.some((part) => part.type === "reasoning") &&
    content.every((part) => part.type === "reasoning");

  return (
    <div className="lb-ai-chat-message-content">
      {content.map((part, index) => {
        switch (part.type) {
          case "text": {
            return (
              <TextPart
                key={index}
                text={part.text}
                components={components}
                className="lb-ai-chat-message-text"
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
                components={components}
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
interface TextPartProps extends ComponentProps<"div"> {
  text: string;
  components: Partial<GlobalComponents> | undefined;
}

const TextPart = forwardRef<HTMLDivElement, TextPartProps>(
  ({ text, components, ...props }, forwardedRef) => {
    const tokens = useMemo(() => {
      return new Lexer().lex(text);
    }, [text]);

    return (
      <div ref={forwardedRef} {...props}>
        {tokens.map((token, index) => {
          return (
            <MemoizedBlockTokenComp
              token={token as BlockToken}
              key={index}
              components={components}
            />
          );
        })}
      </div>
    );
  }
);

// TODO: Improve (better copy handling, tooltips, etc)
function CodeBlock({
  language,
  code,
}: ComponentProps<MarkdownComponents["CodeBlock"]>) {
  const [isCopied, setCopied] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (isCopied) {
      timeoutRef.current = setTimeout(() => {
        setCopied(false);
      }, 1000);
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [isCopied]);

  return (
    <div className="lb-code-block">
      <div className="lb-code-block-header">
        <span className="lb-code-block-title">{language ?? "Plain text"}</span>
        <div className="lb-code-block-header-actions">
          <Button
            className="lb-code-block-header-action"
            icon={isCopied ? <CheckIcon /> : <CopyIcon />}
            onClick={() => {
              setCopied(true);
              navigator.clipboard.writeText(code);
            }}
          />
        </div>
      </div>
      <pre className="lb-code-block-content">
        <code>{code}</code>
      </pre>
    </div>
  );
}

const MemoizedBlockTokenComp = memo(
  function BlockTokenComp({
    token,
    components,
  }: {
    token: BlockToken;
    components?: Partial<GlobalComponents>;
  }) {
    const { Anchor } = useComponents(components);

    return (
      <BlockTokenCompPrimitive
        token={token}
        components={{ CodeBlock, Anchor }}
      />
    );
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
  chatId: string;
  name: string;
  args: any;
}) {
  const client = useClient();

  const tool = useSignal(
    client[kInternal].ai.signals.getToolDefinitionΣ(chatId, name)
  );
  if (tool === undefined || tool.render === undefined) return null;

  return (
    <div className="lb-ai-chat-message-tool">
      <tool.render args={args as unknown} />
    </div>
  );
}

/* -------------------------------------------------------------------------------------------------
 * ReasoningPart
 * -----------------------------------------------------------------------------------------------*/
function ReasoningPart({
  text,
  isPending,
  components,
}: {
  text: string;
  isPending: boolean;
  components: Partial<GlobalComponents> | undefined;
}) {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <CollapsiblePrimitive.Root
      className="lb-ai-chat-message-collapsible lb-ai-chat-message-reasoning"
      open={isOpen}
      onOpenChange={setIsOpen}
    >
      <CollapsiblePrimitive.Trigger
        className={classNames(
          "lb-ai-chat-message-collapsible-trigger",
          isPending && "lb-ai-chat-pending"
        )}
      >
        {/* TODO: If `isPending` is true, show "Reasoning…"/"Thinking…", otherwise show "Reasoned/thought for x seconds"? */}
        Reasoning
        <span className="lb-ai-chat-message-collapsible-chevron lb-icon-container">
          <ChevronRightIcon />
        </span>
      </CollapsiblePrimitive.Trigger>

      <CollapsiblePrimitive.Content className="lb-ai-chat-message-collapsible-content">
        <TextPart text={text} components={components} />
      </CollapsiblePrimitive.Content>
    </CollapsiblePrimitive.Root>
  );
}
