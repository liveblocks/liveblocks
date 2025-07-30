import { Slot } from "@radix-ui/react-slot";
import { forwardRef, useMemo } from "react";

import { SpinnerIcon } from "../../icons";
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
  KnowledgePart: ({ question, stage }) => {
    return (
      <div
        style={{
          margin: "1rem 0",
          padding: "1rem",
        }}
      ><h3>{stage === "receiving" || stage === "executing" ? <SpinnerIcon style={{ marginRight: "0.5rem" }} /> : " 🔍 "} Getting Knowledge</h3><p>Question: {question}</p></div>
    );
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
  ({ message, components, asChild, copilotId, ...props }, forwardedRef) => {
    const Component = asChild ? Slot : "div";
    const { TextPart, ReasoningPart, KnowledgePart, ToolInvocationPart } = useMemo(
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

              /* 
                TODO: @marc, I didn't know how to list the current tools here so I can check if the user has defined a getInformation tool
                if the user has defined a getInformation tool, then it will de-conflict to lbGetInformation, in which case we need to check that instead.
                I thought of maybe moving that logic up to this level and making ToolInvocationPart a lot simpler
                -JR
              */
              if (part.name === "getInformation" || part.name === "lbGetInformation") {
                return <KnowledgePart key={index} question={part.args?.question as string} stage={part.stage} />;
              }
              return (
                <ToolInvocationPart
                  key={index}
                  part={part}
                  {...extra}
                  message={message}
                  copilotId={copilotId}
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
