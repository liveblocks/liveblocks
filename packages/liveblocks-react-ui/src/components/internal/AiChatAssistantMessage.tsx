import type {
  AiAssistantMessage,
  AiRetrievalPart,
  AiWebRetrievalPart,
  WithNavigation,
} from "@liveblocks/core";
import { useUrlMetadata } from "@liveblocks/react";
import {
  type ComponentProps,
  forwardRef,
  memo,
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { type GlobalComponents, useComponents } from "../../components";
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
  AiMessageContentRetrievalPartProps,
  AiMessageContentSourcesPartProps,
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
   * Whether to show sources.
   */
  showSources?: boolean;

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

interface SourcesPartProps extends AiMessageContentSourcesPartProps {
  components?: Partial<GlobalComponents & AiChatAssistantMessageComponents>;
}

interface AiChatSourceProps extends ComponentProps<"a"> {
  source: { url: string; title?: string };
  components?: Partial<GlobalComponents>;
}

interface AiChatSourcesProps extends ComponentProps<"ol"> {
  sources: AiChatSourceProps["source"][];
  maxSources?: number;
  components?: Partial<GlobalComponents>;
}

function getUrlDomain(url: string) {
  return new URL(url).hostname;
}

function AiChatSource({
  source,
  components,
  className,
  ...props
}: AiChatSourceProps) {
  const { Anchor } = useComponents(components);
  const { metadata } = useUrlMetadata(source.url);
  const label = useMemo(() => {
    return source.title ?? metadata?.title ?? getUrlDomain(source.url);
  }, [source.title, source.url, metadata?.title]);

  return (
    <Anchor
      href={source.url}
      target="_blank"
      rel="noopener noreferrer"
      className={cn("lb-ai-chat-source", className)}
      {...props}
    >
      <Favicon url={source.url} className="lb-ai-chat-source-favicon" />
      <span className="lb-ai-chat-source-label">{label}</span>
    </Anchor>
  );
}

function AiChatSources({
  sources: allSources,
  maxSources,
  components,
  className,
  ...props
}: AiChatSourcesProps) {
  const $ = useOverrides();
  const [isOpen, setOpen] = useState(false);
  const visibleSources =
    typeof maxSources === "number" && !isOpen
      ? allSources.slice(0, maxSources)
      : allSources;

  const handleToggle = useCallback(() => {
    setOpen((isOpen) => !isOpen);
  }, []);

  return (
    <ol className={cn("lb-ai-chat-sources", className)} {...props}>
      {visibleSources.map((source, index) => {
        return (
          <li key={`${index}-${source.url}`}>
            <AiChatSource source={source} components={components} />
          </li>
        );
      })}

      {visibleSources.length !== allSources.length ? (
        <li>
          <button className="lb-ai-chat-sources-more" onClick={handleToggle}>
            <span className="lb-ai-chat-sources-more-label">
              + {$.LIST_REMAINING(allSources.length - visibleSources.length)}
            </span>
          </button>
        </li>
      ) : null}
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
        showSources,
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
          showSources={showSources}
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
  showSources = true,
}: {
  message: UiAssistantMessage;
  components?: Partial<GlobalComponents & AiChatAssistantMessageComponents>;
  showReasoning?: AiChatAssistantMessageProps["showReasoning"];
  showRetrievals?: AiChatAssistantMessageProps["showRetrievals"];
  showSources?: AiChatAssistantMessageProps["showSources"];
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
        SourcesPart: showSources ? SourcesPart : NoopComponent,
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
function RetrievalPartFavicons({
  sources,
  maxSources,
}: {
  sources: AiWebRetrievalPart["sources"];
  maxSources?: number;
}) {
  if (!sources) {
    return null;
  }

  const visibleSources =
    typeof maxSources === "number" ? sources.slice(0, maxSources) : sources;

  return (
    <div className="lb-ai-chat-message-retrieval-favicons">
      {visibleSources.map((source) => (
        <Favicon key={source.url} url={source.url} />
      ))}
    </div>
  );
}

function RetrievalPart({ part, isStreaming }: RetrievalPartProps) {
  const $ = useOverrides();
  let content: ReactNode = null;

  if (part.kind === "web" && part.sources && part.sources.length > 0) {
    content = (
      <AiChatSources
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
        {part.kind === "web" ? (
          <RetrievalPartFavicons sources={part.sources} maxSources={3} />
        ) : null}
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
 * SourcesPart
 * -----------------------------------------------------------------------------------------------*/
function SourcesPart({ part }: SourcesPartProps) {
  return (
    <AiChatSources
      className="lb-ai-chat-message-sources"
      sources={part.sources}
      maxSources={5}
    />
  );
}
