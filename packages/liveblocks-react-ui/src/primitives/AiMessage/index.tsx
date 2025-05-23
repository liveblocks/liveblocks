import type {
  AiToolInvocationPart,
  AiToolInvocationProps,
  Json,
  MessageId,
} from "@liveblocks/core";
import { kInternal } from "@liveblocks/core";
import { useClient } from "@liveblocks/react";
import { useSignal } from "@liveblocks/react/_private";
import { Slot } from "@radix-ui/react-slot";
import {
  createContext,
  forwardRef,
  Fragment,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";

import { ChevronDownIcon, ChevronRightIcon } from "../../icons";
import * as CollapsiblePrimitive from "../../primitives/internal/Collapsible";
import { MarkdownWithMemoizedBlocks } from "../internal/Markdown";
import type {
  AiMessageContentComponents,
  AiMessageContentProps,
} from "./types";

const AI_MESSAGE_CONTENT_NAME = "AiMessageContent";

const defaultMessageContentComponents: AiMessageContentComponents = {
  TextPart: ({ part }) => {
    return (
      <div>
        <MarkdownWithMemoizedBlocks content={part.text} />
      </div>
    );
  },
  ReasoningPart: ({ part }) => {
    const [isOpen, setIsOpen] = useState(false);

    return (
      <CollapsiblePrimitive.Root open={isOpen} onOpenChange={setIsOpen}>
        <CollapsiblePrimitive.Trigger>
          Reasoning
          {isOpen ? <ChevronDownIcon /> : <ChevronRightIcon />}
        </CollapsiblePrimitive.Trigger>

        <CollapsiblePrimitive.Content>
          <MarkdownWithMemoizedBlocks content={part.text} />
        </CollapsiblePrimitive.Content>
      </CollapsiblePrimitive.Root>
    );
  },
  ToolInvocationPart: Fragment,
};

/* -------------------------------------------------------------------------------------------------
 * ToolInvocationPart
 * -----------------------------------------------------------------------------------------------*/
const AiToolInvocationContext = createContext<AiToolInvocationProps | null>(
  null
);

export function useAiToolInvocationContext() {
  const context = useContext(AiToolInvocationContext);

  if (context === null) {
    throw new Error(
      "This component must be used within a tool's render method."
    );
  }

  return context;
}

function ToolInvocation({
  chatId,
  messageId,
  part,
}: {
  chatId: string;
  messageId: MessageId;
  part: AiToolInvocationPart;
}) {
  const client = useClient();
  const ai = client[kInternal].ai;
  const tool = useSignal(ai.signals.getToolDefinitionΣ(chatId, part.toolName));

  const respond = useCallback(
    (result: Json) => {
      if (part.status === "receiving") {
        console.log(
          `Ignoring respond(): tool '${part.toolName}' (${part.toolCallId}) is still receiving`
        );
      } else if (part.status === "executed") {
        console.log(
          `Ignoring respond(): tool '${part.toolName}' (${part.toolCallId}) has already executed`
        );
      } else {
        ai.setToolResult(
          chatId,
          messageId,
          part.toolCallId,
          result
          // TODO Pass in AiGenerationOptions here?
        );
      }
    },
    [ai, chatId, messageId, part.status, part.toolName, part.toolCallId]
  );

  if (tool === undefined || tool.render === undefined) return null;

  const { type: _, ...rest } = part;
  const props = { ...rest, respond };
  return (
    <AiToolInvocationContext.Provider value={props}>
      <tool.render {...props} />
    </AiToolInvocationContext.Provider>
  );
}

/**
 * --------------------------------------------------------------------------
 * @private The API for this component is not yet stable.
 * --------------------------------------------------------------------------
 *
 * Primitive to help display an user or assistant message’s content, which is
 * an array of parts.
 *
 * @example
 * <AiMessage.Content message={message} components={{ TextPart }} />
 */
const AiMessageContent = forwardRef<HTMLDivElement, AiMessageContentProps>(
  ({ message, components, style, asChild, ...props }, forwardedRef) => {
    const Component = asChild ? Slot : "div";
    const { TextPart, ReasoningPart, ToolInvocationPart } = useMemo(
      () => ({ ...defaultMessageContentComponents, ...components }),
      [components]
    );

    const content = message.content ?? message.contentSoFar;
    const numParts = content.length;
    const isGenerating =
      message.role === "assistant" && message.status === "generating";
    return (
      <Component
        {...props}
        style={{ whiteSpace: "break-spaces", ...style }}
        ref={forwardedRef}
      >
        {content.map((part, index) => {
          // A part is considered to be still "streaming in" if it's the last
          // part in the content array, and the message is in "generating"
          // state.
          const isStreaming = isGenerating && index === numParts - 1;
          const extra = { index, isStreaming };
          switch (part.type) {
            case "text":
              return <TextPart key={index} part={part} {...extra} />;
            case "reasoning":
              return <ReasoningPart key={index} part={part} {...extra} />;
            case "tool-invocation":
              return (
                <ToolInvocationPart key={index} part={part} {...extra}>
                  <ToolInvocation
                    key={index}
                    part={part}
                    chatId={message.chatId}
                    messageId={message.id}
                  />
                </ToolInvocationPart>
              );
            default:
              return null;
          }
        })}
      </Component>
    );
  }
);

if (process.env.NODE_ENV !== "production") {
  AiMessageContent.displayName = AI_MESSAGE_CONTENT_NAME;
}

// NOTE: Every export from this file will be available publicly as AiMessage.*
export { AiMessageContent as Content };
