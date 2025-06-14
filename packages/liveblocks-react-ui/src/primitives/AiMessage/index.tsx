import { Slot } from "@radix-ui/react-slot";
import { forwardRef, useMemo } from "react";

import { ErrorBoundary } from "../../utils/ErrorBoundary";
import { Markdown } from "../Markdown";
import { AiMessageToolInvocation } from "./tool-invocation";
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
  ToolInvocationPart: ({ part, message }) => {
    return (
      <ErrorBoundary fallback={null}>
        <AiMessageToolInvocation part={part} message={message} />
      </ErrorBoundary>
    );
  },
};

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
              return (
                <ToolInvocationPart
                  key={index}
                  part={part}
                  {...extra}
                  message={message}
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
