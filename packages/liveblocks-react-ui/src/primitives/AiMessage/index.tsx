import type {
  AiToolInvocationPart,
  AiToolInvocationProps,
  JsonObject,
  MessageId,
  ToolResultData,
} from "@liveblocks/core";
import { kInternal } from "@liveblocks/core";
import { useClient } from "@liveblocks/react";
import { useSignal } from "@liveblocks/react/_private";
import { Slot } from "@radix-ui/react-slot";
import type { FunctionComponent } from "react";
import { forwardRef, useCallback, useMemo } from "react";

import { ErrorBoundary } from "../../utils/ErrorBoundary";
import { getStableRenderFn } from "../../utils/stableRenderFunction";
import { Markdown } from "../Markdown";
import { AiToolInvocationContext } from "./contexts";
import type {
  AiMessageContentComponents,
  AiMessageContentProps,
} from "./types";

const AI_MESSAGE_CONTENT_NAME = "AiMessageContent";

const defaultMessageContentComponents: AiMessageContentComponents = {
  TextPart: ({ part }) => {
    return <Markdown content={part.text} />;
  },
  ReasoningPart: ({ part }) => {
    return <Markdown content={part.text} />;
  },
  ToolInvocationPart: ({ children }) => children,
};

/* -------------------------------------------------------------------------------------------------
 * ToolInvocationPart
 * -----------------------------------------------------------------------------------------------*/

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
  const tool = useSignal(ai.signals.getToolΣ(part.toolName, chatId));

  const respond = useCallback(
    (result: ToolResultData) => {
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

  // Return a stable render function that will stays referentially identical
  // for the entire lifetime of a toolCallId. This is important because if we
  // don't do this, then React will think it's a new component every time, and
  // will unmount/remount it, causing it to lose its state.
  const StableRenderFn = getStableRenderFn(
    part.toolCallId,
    tool.render as FunctionComponent<
      AiToolInvocationProps<JsonObject, ToolResultData>
    >
  );

  const { type: _, ...rest } = part;
  const props = {
    ...rest,
    respond,
    types: undefined as never,
    [kInternal]: {
      execute: tool.execute,
    },
  };
  return (
    <ErrorBoundary
      fallback={
        <p style={{ color: "red" }}>
          Failed to render tool call result for ‘{part.toolName}’. See console
          for details.
        </p>
      }
    >
      <AiToolInvocationContext.Provider value={props}>
        <StableRenderFn {...props} />
      </AiToolInvocationContext.Provider>
    </ErrorBoundary>
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
  ({ message, components, asChild, ...props }, forwardedRef) => {
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
      <Component {...props} ref={forwardedRef}>
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
              // TODO: If the render() method doesn't exist, we should not render the ToolInvocationPart
              //       or pass it no children so that it can decide to not render?
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
