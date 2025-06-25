import type { AiAssistantMessage, WithNavigation } from "@liveblocks/core";
import {
  type ComponentProps,
  forwardRef,
  memo,
  type ReactNode,
  useState,
} from "react";

import { ComponentsProvider, type GlobalComponents } from "../../components";
import { ChevronRightIcon } from "../../icons/ChevronRight";
import { WarningIcon } from "../../icons/Warning";
import {
  type AiChatMessageOverrides,
  type GlobalOverrides,
  OverridesProvider,
  useOverrides,
} from "../../overrides";
import * as AiMessage from "../../primitives/AiMessage";
import { AiMessageToolInvocation } from "../../primitives/AiMessage/tool-invocation";
import type {
  AiMessageContentReasoningPartProps,
  AiMessageContentTextPartProps,
  AiMessageContentToolInvocationPartProps,
} from "../../primitives/AiMessage/types";
import * as Collapsible from "../../primitives/Collapsible";
import { cn } from "../../utils/cn";
import { ErrorBoundary } from "../../utils/ErrorBoundary";
import { Prose } from "./Prose";

type UiAssistantMessage = WithNavigation<AiAssistantMessage>;

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
      } else if (
        message.status === "generating" ||
        message.status === "awaiting-tool"
      ) {
        if (message.contentSoFar.length === 0) {
          children = (
            <div className="lb-ai-chat-message-thinking lb-ai-chat-pending">
              {$.AI_CHAT_MESSAGE_THINKING}
            </div>
          );
        } else {
          children = <AssistantMessageContent message={message} />;
        }
      } else if (message.status === "completed") {
        children = <AssistantMessageContent message={message} />;
      } else if (message.status === "failed") {
        // Do not include the error message if the user aborted the request.
        if (message.errorReason === "Aborted by user") {
          children = <AssistantMessageContent message={message} />;
        } else {
          children = (
            <>
              <AssistantMessageContent message={message} />

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
          className={cn(
            "lb-ai-chat-message lb-ai-chat-assistant-message",
            className
          )}
          {...props}
          ref={forwardedRef}
        >
          <OverridesProvider overrides={overrides}>
            <ComponentsProvider components={components}>
              {children}
            </ComponentsProvider>
          </OverridesProvider>
        </div>
      );
    }
  )
);

function AssistantMessageContent({ message }: { message: UiAssistantMessage }) {
  return (
    <AiMessage.Content
      message={message}
      components={{
        TextPart,
        ReasoningPart,
        ToolInvocationPart,
      }}
      className="lb-ai-chat-message-content"
    />
  );
}

/* -------------------------------------------------------------------------------------------------
 * TextPart
 * -----------------------------------------------------------------------------------------------*/
function TextPart({ part }: AiMessageContentTextPartProps) {
  return <Prose content={part.text} className="lb-ai-chat-message-text" />;
}

/* -------------------------------------------------------------------------------------------------
 * ReasoningPart
 * -----------------------------------------------------------------------------------------------*/
function ReasoningPart({
  part,
  isStreaming,
}: AiMessageContentReasoningPartProps) {
  const [isOpen, setIsOpen] = useState(false);
  const $ = useOverrides();

  return (
    <Collapsible.Root
      className="lb-collapsible lb-ai-chat-message-reasoning"
      open={isOpen}
      onOpenChange={setIsOpen}
    >
      <Collapsible.Trigger
        className={cn(
          "lb-collapsible-trigger",
          isStreaming && "lb-ai-chat-pending"
        )}
      >
        {/* TODO: Show duration as "Reasoned for x seconds"? */}
        {$.AI_CHAT_MESSAGE_REASONING(isStreaming)}
        <span className="lb-collapsible-chevron lb-icon-container">
          <ChevronRightIcon />
        </span>
      </Collapsible.Trigger>

      <Collapsible.Content className="lb-collapsible-content">
        <Prose content={part.text} />
      </Collapsible.Content>
    </Collapsible.Root>
  );
}

/* -------------------------------------------------------------------------------------------------
 * ToolInvocationPart
 * -----------------------------------------------------------------------------------------------*/
function ToolInvocationPart({
  part,
  message,
}: AiMessageContentToolInvocationPartProps) {
  return (
    <div className="lb-ai-chat-message-tool-invocation">
      <ErrorBoundary
        fallback={
          process.env.NODE_ENV !== "production" ? (
            <div className="lb-ai-chat-message-error">
              <span className="lb-icon-container">
                <WarningIcon />
              </span>
              <p>
                Failed to render tool call result for <code>{part.name}</code>.
                See console for details.
              </p>
            </div>
          ) : null
        }
      >
        <AiMessageToolInvocation part={part} message={message} />
      </ErrorBoundary>
    </div>
  );
}
