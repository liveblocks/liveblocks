import type {
  AiToolDefinitionRenderProps,
  AiToolInvocationPart,
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
  useCallback,
  useContext,
  useMemo,
} from "react";

import type {
  AiMessageContentComponents,
  AiMessageContentProps,
} from "./types";

const AI_MESSAGE_CONTENT_NAME = "AiMessageContent";

const defaultMessageContentComponents: AiMessageContentComponents = {
  TextPart: () => "Default TextPart is not implemented yet",
  ReasoningPart: () => "Default ReasoningPart is not implemented yet",
  UploadedImagePart: () => "Default UploadedImagePart is not implemented yet",
};

/* -------------------------------------------------------------------------------------------------
 * ToolInvocationPart
 * -----------------------------------------------------------------------------------------------*/
// XXX Rename to AiToolInvocationContext?
const AiToolDefinitionRenderContext =
  createContext<AiToolDefinitionRenderProps | null>(null);

// XXX Rename to useAiToolInvocationContext?
export function useAiToolDefinitionRenderContext() {
  const context = useContext(AiToolDefinitionRenderContext);

  if (context === null) {
    throw new Error(
      "This component must be used within a tool's render method."
    );
  }

  return context;
}

function ToolInvocationPart({
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
    <AiToolDefinitionRenderContext.Provider value={props}>
      <tool.render {...props} />
    </AiToolDefinitionRenderContext.Provider>
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
    const { TextPart, ReasoningPart, UploadedImagePart } = useMemo(
      () => ({ ...defaultMessageContentComponents, ...components }),
      [components]
    );

    const content = message.content ?? message.contentSoFar;
    return (
      <Component
        {...props}
        style={{ whiteSpace: "break-spaces", ...style }}
        ref={forwardedRef}
      >
        {content.map((part, index) => {
          switch (part.type) {
            case "text":
              return <TextPart key={index} part={part} />;
            case "image":
              return <UploadedImagePart key={index} part={part} />;
            case "reasoning":
              return <ReasoningPart key={index} part={part} />;
            case "tool-invocation":
              return (
                <ToolInvocationPart
                  key={index}
                  part={part}
                  chatId={message.chatId}
                  messageId={message.id}
                />
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
