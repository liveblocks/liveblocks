import type {
  AiKnowledgeSource,
  AiOpaqueToolDefinition,
  CopilotId,
  MessageId,
} from "@liveblocks/core";
import {
  RegisterAiKnowledge,
  RegisterAiTool,
  useAiChatMessages,
} from "@liveblocks/react";
import {
  type ComponentProps,
  type ComponentType,
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";

import type { GlobalComponents } from "../components";
import { ArrowDownIcon } from "../icons/ArrowDown";
import { SpinnerIcon } from "../icons/Spinner";
import {
  type AiChatComposerOverrides,
  type AiChatMessageOverrides,
  type AiChatOverrides,
  type GlobalOverrides,
  useOverrides,
} from "../overrides";
import { cn } from "../utils/cn";
import { useVisible } from "../utils/use-visible";
import { AiChatAssistantMessage } from "./internal/AiChatAssistantMessage";
import { AiChatComposer } from "./internal/AiChatComposer";
import { AiChatUserMessage } from "./internal/AiChatUserMessage";

export type AiChatComponentsEmptyProps = {
  /**
   * The chat id provided to the `AiChat` component.
   */
  chatId: string;
  /**
   * The copilot id provided to the `AiChat` component.
   */
  copilotId?: string;
};

export type AiChatComponentsLoadingProps = Record<string, never>;

// TODO: Add Markdown components
export type AiChatComponents = {
  /**
   * The component used to render the empty state of the chat.
   */
  Empty: ComponentType<AiChatComponentsEmptyProps>;
  /**
   * The component used to render the loading state of the chat.
   */
  Loading: ComponentType<AiChatComponentsLoadingProps>;
};

/**
 * The minimum number of pixels from the bottom of the scrollable area
 * before showing the scroll to bottom indicator.
 */
const MIN_DISTANCE_BOTTOM_SCROLL_INDICATOR = 50;

export interface AiChatProps extends ComponentProps<"div"> {
  /**
   * The id of the chat the composer belongs to.
   */
  chatId: string;
  /**
   * Whether to focus the chat composer on mount.
   */
  autoFocus?: boolean;
  /**
   * The id of the copilot to use to send the message.
   */
  copilotId?: string;
  /**
   * The contextual knowledge to include in the chat. May be used by the assistant when generating responses.
   * Any knowledge you provide via this prop will be added to any already globally registered knowledge via <RegisterAiKnowledge />.
   */
  knowledge?: AiKnowledgeSource[];
  /**
   * Tool definitions to make available within this chat. May be used by the assistant when generating responses.
   */
  tools?: Record<string, AiOpaqueToolDefinition>;
  /**
   * The layout of the chat and its composer.
   */
  layout?: "inset" | "compact";
  /**
   * Override the component's strings.
   */
  overrides?: Partial<
    GlobalOverrides &
      AiChatMessageOverrides &
      AiChatComposerOverrides &
      AiChatOverrides
  >;
  /**
   * Override the component's components.
   */
  components?: Partial<GlobalComponents & AiChatComponents>;
}

const defaultComponents: AiChatComponents = {
  Empty: () => null,
  Loading: () => (
    <div className="lb-loading lb-ai-chat-loading">
      <SpinnerIcon />
    </div>
  ),
};

export const AiChat = forwardRef<HTMLDivElement, AiChatProps>(
  (
    {
      chatId,
      copilotId,
      autoFocus,
      overrides,
      knowledge,
      tools = {},
      layout = "inset",
      components,
      className,
      ...props
    },
    forwardedRef
  ) => {
    const { messages, isLoading, error } = useAiChatMessages(chatId);
    const $ = useOverrides(overrides);
    const Empty = components?.Empty ?? defaultComponents.Empty;
    const Loading = components?.Loading ?? defaultComponents.Loading;

    const containerRef = useRef<HTMLDivElement | null>(null);
    const containerBottomRef = useRef<HTMLDivElement | null>(null);
    const isScrollIndicatorEnabled = !isLoading && !error;
    const isScrollAtBottom = useVisible(containerBottomRef, {
      enabled: isScrollIndicatorEnabled,
      root: containerRef,
      rootMargin: MIN_DISTANCE_BOTTOM_SCROLL_INDICATOR,
      initialValue: null,
    });
    const isScrollIndicatorVisible =
      isScrollIndicatorEnabled && isScrollAtBottom !== null
        ? !isScrollAtBottom
        : false;

    const [lastSentMessageId, setLastSentMessageId] =
      useState<MessageId | null>(null);

    useImperativeHandle<HTMLDivElement | null, HTMLDivElement | null>(
      forwardedRef,
      () => containerRef.current,
      []
    );

    const scrollToBottomCallbackRef =
      useRef<(behavior: "instant" | "smooth") => void>(undefined);
    if (scrollToBottomCallbackRef.current === undefined) {
      scrollToBottomCallbackRef.current = function (
        behavior: "instant" | "smooth"
      ) {
        const container = containerRef.current;
        if (container === null) return;

        container.scrollTo({
          top: container.scrollHeight,
          behavior,
        });
      };
    }
    const scrollToBottom = scrollToBottomCallbackRef.current;

    return (
      <div
        ref={containerRef}
        {...props}
        className={cn(
          "lb-root lb-ai-chat",
          layout === "compact"
            ? "lb-ai-chat:layout-compact"
            : "lb-ai-chat:layout-inset",
          className
        )}
      >
        {knowledge
          ? knowledge.map((source, index) => (
              <RegisterAiKnowledge
                key={index}
                description={source.description}
                value={source.value}
                // knowledgeKey={source.knowledgeKey}
              />
            ))
          : null}

        {Object.entries(tools).map(([name, tool]) => (
          <RegisterAiTool key={name} chatId={chatId} name={name} tool={tool} />
        ))}

        <div className="lb-ai-chat-content">
          {isLoading ? (
            <Loading />
          ) : error !== undefined ? (
            <div className="lb-error lb-ai-chat-error">
              {$.AI_CHAT_MESSAGES_ERROR(error)}
            </div>
          ) : messages.length === 0 ? (
            <Empty chatId={chatId} copilotId={copilotId} />
          ) : (
            <>
              <AutoScrollHandler
                lastSentMessageId={lastSentMessageId}
                scrollToBottom={scrollToBottom}
              />
              <div className="lb-ai-chat-messages">
                {messages.map((message) => {
                  if (message.role === "user") {
                    return (
                      <AiChatUserMessage
                        key={message.id}
                        message={message}
                        overrides={overrides}
                      />
                    );
                  } else if (message.role === "assistant") {
                    return (
                      <AiChatAssistantMessage
                        key={message.id}
                        message={message}
                        overrides={overrides}
                        components={components}
                        copilotId={copilotId}
                      />
                    );
                  } else {
                    return null;
                  }
                })}
              </div>
            </>
          )}
        </div>

        <div className="lb-ai-chat-footer">
          <div className="lb-ai-chat-footer-actions">
            <div
              className="lb-root lb-elevation lb-elevation-moderate lb-ai-chat-scroll-indicator"
              data-visible={isScrollIndicatorVisible ? "" : undefined}
            >
              <button
                className="lb-ai-chat-scroll-indicator-button"
                tabIndex={isScrollIndicatorVisible ? 0 : -1}
                aria-hidden={!isScrollIndicatorVisible}
                onClick={() => scrollToBottom("smooth")}
              >
                <span className="lb-icon-container">
                  <ArrowDownIcon />
                </span>
              </button>
            </div>
          </div>
          <AiChatComposer
            key={chatId}
            chatId={chatId}
            copilotId={copilotId as CopilotId}
            overrides={overrides}
            autoFocus={autoFocus}
            onUserMessageCreate={({ id }) => setLastSentMessageId(id)}
            className={
              layout === "inset"
                ? "lb-elevation lb-elevation-moderate"
                : undefined
            }
          />
        </div>
        {/* This invisible element is a trick which allows us to use IntersectionObserver to detect when the
         * scrollable area is fully scrolled to the bottom instead of manually tracking the scroll position
         * and having to deal with resizes, etc.
         *
         * It's positioned at the bottom of the scrollable area and reliably only becomes "visible" to the
         * IntersectionObserver when the scrollable area is fully scrolled.
         */}
        <div
          ref={containerBottomRef}
          style={{ position: "sticky", height: 0 }}
          aria-hidden
          data-scroll-at-bottom={isScrollAtBottom ? "" : undefined}
        />
      </div>
    );
  }
);

function AutoScrollHandler({
  lastSentMessageId,
  scrollToBottom,
}: {
  lastSentMessageId: MessageId | null;
  scrollToBottom: (behavior: "instant" | "smooth") => void;
}) {
  // Scroll to bottom when the component first mounts
  useEffect(() => {
    scrollToBottom("instant");
  }, [scrollToBottom]);

  // Scroll to bottom when sending a new message
  useEffect(() => {
    if (lastSentMessageId === null) return;
    scrollToBottom("smooth");
  }, [lastSentMessageId, scrollToBottom]);

  return null;
}
