import type {
  AiAssistantMessage,
  AiRetrievalPart,
  WithNavigation,
} from "@liveblocks/core";
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
import { Favicon } from "./Favicon";
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
   * How to show or hide reasoning.
   */
  showReasoning?: boolean | "during";

  /**
   * How to show or hide retrievals.
   */
  showRetrievals?:
    | boolean
    | "during"
    | Record<AiRetrievalPart["kind"], boolean | "during">;

  /**
   * Whether to show citations.
   */
  showCitations?: boolean;

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

interface AiChatAssistantMessageSourcesProps extends ComponentProps<"ol"> {
  sources: { url: string; title?: string }[];
}

function AiChatAssistantMessageSources({
  sources,
  className,
  ...props
}: AiChatAssistantMessageSourcesProps) {
  return (
    <ol className={cn("lb-ai-chat-sources", className)} {...props}>
      {sources.map((source, index) => {
        return (
          <li key={`${index}-${source.url}`}>
            {/* TODO: Use `Anchor` component */}
            <a
              href={source.url}
              target="_blank"
              rel="noopener noreferrer"
              className="lb-ai-chat-source"
            >
              <Favicon url={source.url} className="lb-ai-chat-source-favicon" />
              {source.title ? (
                <span className="lb-ai-chat-source-title">{source.title}</span>
              ) : null}
              <span className="lb-ai-chat-source-url">{source.url}</span>
            </a>
          </li>
        );
      })}
    </ol>
  );
}

export const AiChatAssistantMessage = memo(
  forwardRef<HTMLDivElement, AiChatAssistantMessageProps>(
    (
      {
        message,
        className,
        overrides,
        components,
        showReasoning,
        showRetrievals,
        showCitations,
        ...props
      },
      forwardedRef
    ) => {
      const $ = useOverrides(overrides);

      let children: ReactNode = null;

      const messageContent = (
        <AssistantMessageContent
          message={message}
          components={components}
          showReasoning={showReasoning}
          showRetrievals={showRetrievals}
          showCitations={showCitations}
        />
      );

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
          children = messageContent;
        }
      } else if (message.status === "completed") {
        children = messageContent;
      } else if (message.status === "failed") {
        // Do not include the error message if the user aborted the request.
        if (message.errorReason === "Aborted by user") {
          children = messageContent;
        } else {
          children = (
            <>
              {messageContent}

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

const NoopComponent = () => null;

function AssistantMessageContent({
  message,
  components,
  showReasoning = true,
  showRetrievals = true,
  showCitations = true,
}: {
  message: UiAssistantMessage;
  components?: Partial<GlobalComponents & AiChatAssistantMessageComponents>;
  showReasoning?: AiChatAssistantMessageProps["showReasoning"];
  showRetrievals?: AiChatAssistantMessageProps["showRetrievals"];
  showCitations?: AiChatAssistantMessageProps["showCitations"];
}) {
  const componentsRef = useRef(components);
  let showKnowledgeRetrievals =
    typeof showRetrievals === "object"
      ? showRetrievals.knowledge
      : showRetrievals;
  let showWebRetrievals =
    typeof showRetrievals === "object" ? showRetrievals.web : showRetrievals;

  // Both default to `true` if not specified, even with the object form (e.g. `{ web: "during" }`, `knowledge` is still `true`)
  showKnowledgeRetrievals ??= true;
  showWebRetrievals ??= true;

  const BoundTextPart = useMemo(
    () => (props: TextPartProps) => (
      <TextPart {...props} components={componentsRef.current} />
    ),
    []
  );
  const BoundReasoningPart = useMemo(
    () => (props: ReasoningPartProps) => {
      if (
        !showReasoning ||
        (showReasoning === "during" && !props.isStreaming)
      ) {
        return null;
      }

      return <ReasoningPart {...props} components={componentsRef.current} />;
    },
    [showReasoning]
  );
  const BoundRetrievalPart = useMemo(
    () => (props: RetrievalPartProps) => {
      if (props.part.kind === "knowledge") {
        if (
          !showKnowledgeRetrievals ||
          (showKnowledgeRetrievals === "during" && !props.isStreaming)
        ) {
          return null;
        }
      } else if (props.part.kind === "web") {
        if (
          !showWebRetrievals ||
          (showWebRetrievals === "during" && !props.isStreaming)
        ) {
          return null;
        }
      }

      return <RetrievalPart {...props} />;
    },
    [showKnowledgeRetrievals, showWebRetrievals]
  );

  return (
    <AiMessage.Content
      message={message}
      components={{
        TextPart: BoundTextPart,
        ReasoningPart: BoundReasoningPart,
        RetrievalPart: BoundRetrievalPart,
        CitationsPart: showCitations ? CitationsPart : NoopComponent,
        ToolInvocationPart,
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
  let content: ReactNode = null;

  if (part.kind === "web" && part.sources && part.sources.length > 0) {
    content = (
      <AiChatAssistantMessageSources
        className="lb-ai-chat-message-retrieval-sources"
        sources={part.sources}
      />
    );
  }

  return (
    <Collapsible.Root
      className="lb-collapsible lb-ai-chat-message-retrieval"
      defaultOpen={false}
      disabled={!content}
    >
      <Collapsible.Trigger
        className={cn(
          "lb-collapsible-trigger",
          isStreaming && "lb-ai-chat-pending"
        )}
      >
        {$.AI_CHAT_MESSAGE_RETRIEVAL(isStreaming, part)}
        {content ? (
          <span className="lb-collapsible-chevron lb-icon-container">
            <ChevronRightIcon />
          </span>
        ) : null}
      </Collapsible.Trigger>

      {content ? (
        <Collapsible.Content className="lb-collapsible-content">
          {content}
        </Collapsible.Content>
      ) : null}
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
  return (
    <AiChatAssistantMessageSources
      className="lb-ai-chat-message-sources"
      sources={part.citations}
    />
  );
}
