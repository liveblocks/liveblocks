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
import { useLayoutEffect } from "@liveblocks/react/_private";
import {
  type ComponentProps,
  type ComponentType,
  forwardRef,
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
   * The chat ID provided to the `AiChat` component.
   */
  chatId: string;
  /**
   * The Copilot ID provided to the `AiChat` component.
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
const MIN_DISTANCE_BOTTOM_SCROLL_INDICATOR = 60;

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
    const [lastSentMessageId, setLastSentMessageId] =
      useState<MessageId | null>(null);
    const $ = useOverrides(overrides);
    const Empty = components?.Empty ?? defaultComponents.Empty;
    const Loading = components?.Loading ?? defaultComponents.Loading;

    const containerRef = useRef<HTMLDivElement | null>(null);
    const messagesRef = useRef<HTMLDivElement | null>(null);
    const footerRef = useRef<HTMLDivElement | null>(null);
    const scrollBottomRef = useRef<HTMLDivElement | null>(null);
    const trailingSpacerRef = useRef<HTMLDivElement | null>(null);
    const areMessagesLoaded = !isLoading && !error;
    const isScrollAtBottom = useVisible(scrollBottomRef, {
      enabled: areMessagesLoaded,
      root: containerRef,
      rootMargin: MIN_DISTANCE_BOTTOM_SCROLL_INDICATOR,
      initialValue: null,
    });
    const isScrollIndicatorVisible =
      areMessagesLoaded && isScrollAtBottom !== null
        ? !isScrollAtBottom
        : false;

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

    useLayoutEffect(() => {
      if (!areMessagesLoaded) {
        return;
      }

      const container = containerRef.current;
      const footer = footerRef.current;
      const messages = messagesRef.current;

      if (!container || !footer || !messages) {
        return;
      }

      let containerHeight: number | null = null;
      let footerHeight: number | null = null;
      let messagesHeight: number | null = null;

      const resizeObserver = new ResizeObserver((entries) => {
        const trailingSpacer = trailingSpacerRef.current;

        if (!trailingSpacer) {
          return;
        }

        const lastMessage = messages.lastElementChild;
        const penultimateMessage = lastMessage?.previousElementSibling;

        // If there's no last pair of messages, we can't do anything yet.
        if (!lastMessage || !penultimateMessage) {
          return;
        }

        let updatedContainerHeight: number | null = containerHeight;
        let updatedFooterHeight: number | null = footerHeight;
        let updatedMessagesHeight: number | null = messagesHeight;

        for (const entry of entries) {
          const entryHeight = entry.borderBoxSize[0]?.blockSize;

          if (entry.target === container) {
            updatedContainerHeight = entryHeight ?? null;
          } else if (entry.target === footer) {
            updatedFooterHeight = entryHeight ?? null;
          } else if (entry.target === messages) {
            updatedMessagesHeight = entryHeight ?? null;
          }
        }

        // If we don't have all the heights, we can't do anything yet.
        if (
          updatedContainerHeight === null ||
          updatedFooterHeight === null ||
          updatedMessagesHeight === null
        ) {
          return;
        }

        // If none of the heights have changed, we don't need to do anything.
        if (
          updatedContainerHeight === containerHeight &&
          updatedFooterHeight === footerHeight &&
          updatedMessagesHeight === messagesHeight
        ) {
          return;
        }

        // Now that we have compared them, we can update the heights.
        containerHeight = updatedContainerHeight;
        footerHeight = updatedFooterHeight;
        messagesHeight = updatedMessagesHeight;

        const messagesRect = messages.getBoundingClientRect();
        const penultimateMessageRect =
          penultimateMessage.getBoundingClientRect();
        const heightFromPenultimateMessageToFooter =
          messagesRect.bottom - penultimateMessageRect.top;

        const penultimateMessageScrollMarginTop = Number.parseFloat(
          getComputedStyle(penultimateMessage as HTMLElement).scrollMarginTop
        );

        const trailingSpacerHeight =
          containerHeight -
          penultimateMessageScrollMarginTop -
          heightFromPenultimateMessageToFooter -
          (footerHeight ?? 0);

        trailingSpacer.style.height = `${trailingSpacerHeight}px`;
      });

      resizeObserver.observe(container);
      resizeObserver.observe(footer);
      resizeObserver.observe(messages);

      return () => {
        resizeObserver.disconnect();
      };
    }, [areMessagesLoaded]);

    // Instantly scroll to bottom when the messages load for the first time
    useLayoutEffect(() => {
      if (!isLoading && !error && messages.length > 0) {
        scrollToBottom("instant");
      }
      // If we include `messages.length` in the dependency array, this effect would
      // be triggered if the messages load at 0 and then move to 1+ later. We only
      // want it to run when the messages load for the first time.
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [scrollToBottom, isLoading, error]);

    // Scroll to new messages when sending them
    useLayoutEffect(() => {
      if (lastSentMessageId) {
        requestAnimationFrame(() => {
          scrollToBottom("smooth");
        });
      }
    }, [lastSentMessageId, scrollToBottom]);

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
              <div className="lb-ai-chat-messages" ref={messagesRef}>
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
              {/* This empty space is used to extend the scrollable area beyond its actual content. */}
              <div
                ref={trailingSpacerRef}
                data-trailing-spacer=""
                style={{ pointerEvents: "none" }}
                aria-hidden
              />
            </>
          )}
        </div>

        <div className="lb-ai-chat-footer" ref={footerRef}>
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
          ref={scrollBottomRef}
          style={{ position: "sticky", height: 0 }}
          aria-hidden
          data-scroll-bottom={isScrollAtBottom}
        />
      </div>
    );
  }
);
