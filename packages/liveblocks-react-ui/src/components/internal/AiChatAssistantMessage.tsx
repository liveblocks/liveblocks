import type { AiAssistantMessage, WithNavigation } from "@liveblocks/core";
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

import { type GlobalComponents } from "../../components";
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
  AiMessageContentCitationsPartProps,
  AiMessageContentReasoningPartProps,
  AiMessageContentRetrievalPartProps,
  AiMessageContentTextPartProps,
  AiMessageContentToolInvocationPartProps,
} from "../../primitives/AiMessage/types";
import * as Collapsible from "../../primitives/Collapsible";
import type { MarkdownComponents } from "../../primitives/Markdown";
import { cn } from "../../utils/cn";
import { ErrorBoundary } from "../../utils/ErrorBoundary";
import { Prose } from "./Prose";

type UiAssistantMessage = WithNavigation<AiAssistantMessage>;

type AiChatAssistantMessageComponents = {
  /**
   * The components used to render Markdown content.
   */
  markdown?: Partial<MarkdownComponents>;
};

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
  components?: Partial<GlobalComponents & AiChatAssistantMessageComponents>;
}

interface TextPartProps extends AiMessageContentTextPartProps {
  components?: Partial<GlobalComponents & AiChatAssistantMessageComponents>;
}

interface ReasoningPartProps extends AiMessageContentReasoningPartProps {
  components?: Partial<GlobalComponents & AiChatAssistantMessageComponents>;
}

interface RetrievalPartProps extends AiMessageContentRetrievalPartProps {
  components?: Partial<GlobalComponents & AiChatAssistantMessageComponents>;
}

interface CitationsPartProps extends AiMessageContentCitationsPartProps {
  components?: Partial<GlobalComponents & AiChatAssistantMessageComponents>;
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
          children = (
            <AssistantMessageContent
              message={message}
              components={components}
            />
          );
        }
      } else if (message.status === "completed") {
        children = (
          <AssistantMessageContent message={message} components={components} />
        );
      } else if (message.status === "failed") {
        // Do not include the error message if the user aborted the request.
        if (message.errorReason === "Aborted by user") {
          children = (
            <AssistantMessageContent
              message={message}
              components={components}
            />
          );
        } else {
          children = (
            <>
              <AssistantMessageContent
                message={message}
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
          className={cn(
            "lb-ai-chat-message lb-ai-chat-assistant-message",
            className
          )}
          {...props}
          ref={forwardedRef}
        >
          <OverridesProvider overrides={overrides}>
            {children}
          </OverridesProvider>
        </div>
      );
    }
  )
);

function AssistantMessageContent({
  message,
  components,
}: {
  message: UiAssistantMessage;
  components?: Partial<GlobalComponents & AiChatAssistantMessageComponents>;
}) {
  const ref = useRef(components);
  const BoundTextPart = useMemo(
    () => (props: TextPartProps) => (
      <TextPart {...props} components={ref.current} />
    ),
    []
  );
  const BoundReasoningPart = useMemo(
    () => (props: ReasoningPartProps) => (
      <ReasoningPart {...props} components={ref.current} />
    ),
    []
  );
  return (
    <AiMessage.Content
      message={message}
      components={{
        TextPart: BoundTextPart,
        ReasoningPart: BoundReasoningPart,
        RetrievalPart,
        ToolInvocationPart,
        CitationsPart,
      }}
      className="lb-ai-chat-message-content"
    />
  );
}

/* -------------------------------------------------------------------------------------------------
 * TextPart
 * -----------------------------------------------------------------------------------------------*/
function TextPart({ part, components, isStreaming }: TextPartProps) {
  return (
    <Prose
      content={part.text}
      className="lb-ai-chat-message-text"
      components={components}
      partial={isStreaming}
    />
  );
}

/* -------------------------------------------------------------------------------------------------
 * ReasoningPart
 * -----------------------------------------------------------------------------------------------*/
function ReasoningPart({ part, isStreaming, components }: ReasoningPartProps) {
  // Start collapsed if reasoning is already done.
  const [isOpen, setIsOpen] = useState(isStreaming);
  const $ = useOverrides();

  // Auto-collapse when reasoning is done, while still allowing the user to
  // open/collapse it manually during and after it's done.
  useEffect(() => {
    if (!isStreaming) {
      setIsOpen(false);
    }
  }, [isStreaming]);

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
        {$.AI_CHAT_MESSAGE_REASONING(isStreaming, part)}
        <span className="lb-collapsible-chevron lb-icon-container">
          <ChevronRightIcon />
        </span>
      </Collapsible.Trigger>

      <Collapsible.Content className="lb-collapsible-content">
        <Prose
          content={part.text}
          partial={isStreaming}
          components={components}
        />
      </Collapsible.Content>
    </Collapsible.Root>
  );
}

/* -------------------------------------------------------------------------------------------------
 * RetrievalPart
 * -----------------------------------------------------------------------------------------------*/
function RetrievalPart({ part, isStreaming }: RetrievalPartProps) {
  const $ = useOverrides();

  return (
    <div
      className={cn(
        "lb-ai-chat-message-retrieval",
        isStreaming && "lb-ai-chat-pending"
      )}
    >
      {$.AI_CHAT_MESSAGE_RETRIEVAL(isStreaming, part)}
    </div>
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
          <div className="lb-ai-chat-message-error">
            <span className="lb-icon-container">
              <WarningIcon />
            </span>
            <p>
              Failed to render tool call result for <code>{part.name}</code>.
              See console for details.
            </p>
          </div>
        }
      >
        <AiMessageToolInvocation part={part} message={message} />
      </ErrorBoundary>
    </div>
  );
}

/* -------------------------------------------------------------------------------------------------
 * CitationsPart
 * -----------------------------------------------------------------------------------------------*/
function CitationsPart({ part }: CitationsPartProps) {
  const $ = useOverrides();

  return (
    <div className="lb-ai-chat-message-citations">
      {$.AI_CHAT_MESSAGE_CITATIONS(part)}
    </div>
  );
}
