import type {
  AiKnowledgeSource,
  AiToolDefinition,
  CopilotId,
  MessageId,
} from "@liveblocks/core";
import { kInternal } from "@liveblocks/core";
import {
  RegisterAiKnowledge,
  useAiChatMessages,
  useClient,
} from "@liveblocks/react";
import { useLayoutEffect } from "@liveblocks/react/_private";
import {
  type ComponentProps,
  forwardRef,
  useCallback,
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
import { classNames } from "../utils/class-names";
import { useVisible } from "../utils/use-visible";
import { AiChatAssistantMessage } from "./internal/AiChatAssistantMessage";
import { AiChatComposer } from "./internal/AiChatComposer";
import { AiChatUserMessage } from "./internal/AiChatUserMessage";

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
  tools?: Record<string, AiToolDefinition>;
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
  components?: Partial<GlobalComponents>; // TODO: Add more slots than the global ones over time (Markdown tags, the empty state, etc)
}

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

    const containerRef = useRef<HTMLDivElement | null>(null);
    const containerBottomRef = useRef<HTMLDivElement | null>(null);
    const isScrollAtBottom = useVisible(containerBottomRef, {
      enabled: !isLoading && !error,
    });
    const isScrollIndicatorVisible =
      isLoading || error ? false : !isScrollAtBottom;

    const client = useClient();
    const ai = client[kInternal].ai;

    const [lastSendMessageId, setLastSendMessageId] =
      useState<MessageId | null>(null);

    useImperativeHandle<HTMLDivElement | null, HTMLDivElement | null>(
      forwardedRef,
      () => containerRef.current,
      []
    );

    // Register the provided tools to the chat on mount and unregister them on unmount
    useEffect(() => {
      Object.entries(tools).map(([key, value]) =>
        ai.registerChatTool(chatId, key, value)
      );
      return () => {
        Object.entries(tools).map(([key]) =>
          ai.unregisterChatTool(chatId, key)
        );
      };
    }, [ai, chatId, tools]);

    const scrollToBottom = useCallback((behavior: "instant" | "smooth") => {
      const container = containerRef.current;
      if (container === null) return;

      container.scrollTo({
        top: container.scrollHeight,
        behavior,
      });
    }, []);

    return (
      <div
        ref={containerRef}
        {...props}
        className={classNames(
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
        <div className="lb-ai-chat-content">
          {isLoading ? (
            <div className="lb-loading lb-ai-chat-loading">
              <SpinnerIcon />
            </div>
          ) : error !== undefined ? (
            <div className="lb-error lb-ai-chat-error">
              {$.AI_CHAT_MESSAGES_ERROR(error)}
            </div>
          ) : (
            <>
              <AutoScrollToBottomHandler
                lastSendMessageId={lastSendMessageId}
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
                disabled={!isScrollIndicatorVisible}
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
            overrides={$}
            autoFocus={autoFocus}
            onUserMessageCreate={({ id }) => setLastSendMessageId(id)}
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

function AutoScrollToBottomHandler({
  lastSendMessageId,
  scrollToBottom,
}: {
  lastSendMessageId: MessageId | null;
  scrollToBottom: (behavior: "instant" | "smooth") => void;
}) {
  // Scroll to bottom when the component first mounts
  useLayoutEffect(() => {
    scrollToBottom("instant");
  }, [scrollToBottom]);

  // Scroll to bottom when sending a new message
  useEffect(() => {
    scrollToBottom("smooth");
  }, [lastSendMessageId, scrollToBottom]);

  return null;
}
