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
import { useLatest, useLayoutEffect } from "@liveblocks/react/_private";
import {
  type ComponentProps,
  type ComponentType,
  forwardRef,
  type MutableRefObject,
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
import { useIntersectionCallback } from "../utils/use-visible";
import { AiChatAssistantMessage } from "./internal/AiChatAssistantMessage";
import { AiChatComposer } from "./internal/AiChatComposer";
import { AiChatUserMessage } from "./internal/AiChatUserMessage";

/**
 * The minimum number of pixels from the bottom of the scrollable area
 * before showing the scroll to bottom indicator.
 */
const MIN_DISTANCE_BOTTOM_SCROLL_INDICATOR = 60;

export type AiChatComponentsEmptyProps = {
  /**
   * The chat ID provided to the `AiChat` component.
   */
  chatId: string;

  /**
   * The copilot ID provided to the `AiChat` component.
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

export interface AiChatProps extends ComponentProps<"div"> {
  /**
   * The ID of the chat the composer belongs to.
   */
  chatId: string;

  /**
   * Whether to focus the chat composer on mount.
   */
  autoFocus?: boolean;

  /**
   * The ID of the copilot to use to send the message.
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

interface AiChatMessagesProps extends ComponentProps<"div"> {
  messages: NonNullable<ReturnType<typeof useAiChatMessages>["messages"]>;
  overrides: AiChatProps["overrides"];
  components: AiChatProps["components"];
  lastSentMessageId: MessageId | null;
  scrollToBottom: MutableRefObject<
    (behavior: "instant" | "smooth", includeTrailingSpace?: boolean) => void
  >;
  onScrollAtBottomChange: MutableRefObject<
    (isScrollAtBottom: boolean | null) => void
  >;
  containerRef: MutableRefObject<HTMLDivElement | null>;
  footerRef: MutableRefObject<HTMLDivElement | null>;
  messagesRef: MutableRefObject<HTMLDivElement | null>;
  scrollBottomRef: MutableRefObject<HTMLDivElement | null>;
  trailingSpacerRef: MutableRefObject<HTMLDivElement | null>;
}

const defaultComponents: AiChatComponents = {
  Empty: () => null,
  Loading: () => (
    <div className="lb-loading lb-ai-chat-loading">
      <SpinnerIcon />
    </div>
  ),
};

const AiChatMessages = forwardRef<HTMLDivElement, AiChatMessagesProps>(
  (
    {
      messages,
      overrides,
      components,
      lastSentMessageId,
      scrollToBottom,
      onScrollAtBottomChange,
      containerRef,
      footerRef,
      messagesRef,
      scrollBottomRef,
      trailingSpacerRef,
      className,
      ...props
    },
    forwardedRef
  ) => {
    /**
     * Instantly scroll to the bottom for the initial state.
     */
    useLayoutEffect(
      () => {
        scrollToBottom.current("instant");
      },
      // `scrollToBottom` is a stable ref containing the callback.
      [] // eslint-disable-line react-hooks/exhaustive-deps
    );

    /**
     * Scroll to new messages when sending them.
     */
    useLayoutEffect(
      () => {
        if (lastSentMessageId) {
          scrollToBottom.current("smooth", true);
        }
      },
      // `scrollToBottom` is a stable ref containing the callback.
      [lastSentMessageId] // eslint-disable-line react-hooks/exhaustive-deps
    );

    /**
     * Every time the container, footer, or messages list change size,
     * we calculate the trailing space that would allow the penultimate
     * message to be at the top of the viewport, and apply it.
     *
     *   ┌─────────────────────────────────────────┐▲   A = The `scroll-margin-top`
     *   │            ┌─────────────────────────┐  │▼▲  value of the penultimate
     *   │            │ The penultimate message │  │ │
     *   │            └─────────────────────────┘  │ │  B = The height from the top of
     *   │                                         │ │  the penultimate message to the
     *   │ ┌─────────────────────────┐             │ │  bottom of the messages list,
     *   │ │ The last message        │             │ │  including the messages' heights,
     *   │ └─────────────────────────┘             │ │  and any padding, gap, etc
     *   │                                         │ │
     *   ├ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┤▲▼
     *   │                                         ││   The trailing space needed to
     *   │    = container height - (A + B + C)     ││   allow the penultimate message
     *   │                                         ││   to be at the top of the viewport
     *   ├ ┬─────────────────────────────────────┬ ┤▼▲
     *   │ │                                     │ │ │
     *   │ │                                     │ │ │  C = The footer's height,
     *   │ │                                     │ │ │  including any padding
     *   │ └─────────────────────────────────────┘ │ │
     *   └─────────────────────────────────────────┘ ▼
     */
    useLayoutEffect(
      () => {
        const container = containerRef.current;
        const footer = footerRef.current;
        const messages = messagesRef.current;

        if (!container || !footer || !messages) {
          return;
        }

        const trailingSpacer = trailingSpacerRef.current;
        const scrollBottom = scrollBottomRef.current;

        let containerHeight: number | null = null;
        let footerHeight: number | null = null;
        let messagesHeight: number | null = null;

        const resizeObserver = new ResizeObserver((entries) => {
          if (!trailingSpacer || !scrollBottom) {
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
            const entryHeight =
              entry.borderBoxSize?.[0]?.blockSize ?? entry.contentRect.height;

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

          // A
          const penultimateMessageScrollMarginTop = Number.parseFloat(
            getComputedStyle(penultimateMessage as HTMLElement).scrollMarginTop
          );

          // B
          const messagesRect = messages.getBoundingClientRect();
          const penultimateMessageRect =
            penultimateMessage.getBoundingClientRect();
          const heightFromPenultimateMessageTopToMessagesListBottom =
            messagesRect.bottom - penultimateMessageRect.top;

          // A + B + C
          const differenceHeight =
            penultimateMessageScrollMarginTop +
            heightFromPenultimateMessageTopToMessagesListBottom +
            (footerHeight ?? 0);

          // = container height - (A + B + C)
          const trailingSpace = Math.max(containerHeight - differenceHeight, 0);

          // Update the trailing space.
          trailingSpacer.style.height = `${trailingSpace}px`;

          // Offset what "the bottom" is to the "scroll at the bottom" detection logic,
          // so that it doesn't include the trailing space.
          scrollBottom.style.top = `${-trailingSpace}px`;
        });

        resizeObserver.observe(container);
        resizeObserver.observe(footer);
        resizeObserver.observe(messages);

        return () => {
          resizeObserver.disconnect();

          trailingSpacer?.style.removeProperty("height");
          scrollBottom?.style.removeProperty("top");
        };
      },
      // This effect only uses stable refs.
      [] // eslint-disable-line react-hooks/exhaustive-deps
    );

    /**
     * Update the "scroll at bottom" state when needed.
     */
    useIntersectionCallback(
      scrollBottomRef,
      (isIntersecting) => {
        onScrollAtBottomChange.current(isIntersecting);
      },
      { root: containerRef, rootMargin: MIN_DISTANCE_BOTTOM_SCROLL_INDICATOR }
    );

    /**
     * Reset the "scroll at bottom" state when the component unmounts.
     */
    useEffect(
      () => {
        const onScrollAtBottomChangeCallback = onScrollAtBottomChange.current;

        return () => {
          onScrollAtBottomChangeCallback(null);
        };
      },
      // `onScrollAtBottomChange` is a stable ref containing the callback.
      [] // eslint-disable-line react-hooks/exhaustive-deps
    );

    return (
      <div
        className={cn("lb-ai-chat-messages", className)}
        ref={forwardedRef}
        {...props}
      >
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
    );
  }
);

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

    const [isScrollAtBottom, setScrollAtBottom] = useState<boolean | null>(
      null
    );
    // `useState`'s setter is stable but this is for clarity in the places it's used.
    const onScrollAtBottomChange = useLatest(setScrollAtBottom);
    const isScrollIndicatorVisible =
      messages && isScrollAtBottom !== null ? !isScrollAtBottom : false;

    useImperativeHandle<HTMLDivElement | null, HTMLDivElement | null>(
      forwardedRef,
      () => containerRef.current,
      []
    );

    const scrollToBottom = useLatest(
      (behavior: "instant" | "smooth", includeTrailingSpace = false) => {
        const container = containerRef.current;

        if (!container) {
          return;
        }

        if (includeTrailingSpace) {
          // Scroll all the way to include the trailing space,
          // and wait for a frame in case the trailing space hasn't
          // been updated yet. (e.g. when sending a new message)
          requestAnimationFrame(() => {
            container.scrollTo({
              top: container.scrollHeight,
              behavior,
            });
          });
        } else {
          const messagesHeight = messagesRef.current?.offsetHeight ?? 0;
          const footerHeight = footerRef?.current?.offsetHeight ?? 0;

          // Scroll to the bottom of the messages to exclude the trailing space.
          container.scrollTo({
            top: messagesHeight + footerHeight - container.clientHeight,
            behavior,
          });
        }
      }
    );

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
              <AiChatMessages
                ref={messagesRef}
                messages={messages}
                overrides={overrides}
                components={components}
                lastSentMessageId={lastSentMessageId}
                scrollToBottom={scrollToBottom}
                onScrollAtBottomChange={onScrollAtBottomChange}
                containerRef={containerRef}
                footerRef={footerRef}
                messagesRef={messagesRef}
                scrollBottomRef={scrollBottomRef}
                trailingSpacerRef={trailingSpacerRef}
              />

              {/**
               * This trailing spacer is used to extend the scrollable area beyond its actual
               * content, to allow messages to appear at the top of the viewport for example.
               */}
              <div
                ref={trailingSpacerRef}
                data-trailing-spacer=""
                style={{
                  pointerEvents: "none",
                }}
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
                onClick={() => scrollToBottom.current("smooth")}
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

        {/**
         * This invisible element is a trick which allows us to use IntersectionObserver to detect when the
         * scrollable area is fully scrolled to the bottom instead of manually tracking the scroll position
         * and having to deal with resizes, etc.
         *
         * It's positioned at the bottom of the scrollable area and reliably only becomes "visible" to the
         * IntersectionObserver when the scrollable area is scrolled to the bottom.
         */}
        {messages && messages.length > 0 ? (
          <div
            style={{ position: "sticky", height: 0 }}
            aria-hidden
            data-scroll-bottom={isScrollAtBottom}
          >
            {/**
             * This inner element is the actual observed element, it's absolutely positioned which allows us to
             * control what "the bottom" is to the IntersectionObserver without changing the layout.
             */}
            <div
              ref={scrollBottomRef}
              style={{
                position: "absolute",
                height: 0,
              }}
            />
          </div>
        ) : null}
      </div>
    );
  }
);
