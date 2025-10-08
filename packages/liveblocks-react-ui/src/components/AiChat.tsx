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
import { useLatest } from "@liveblocks/react/_private";
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
  type AiChatMessageOverrides,
  type AiChatOverrides,
  type AiComposerOverrides,
  type GlobalOverrides,
  useOverrides,
} from "../overrides";
import type { MarkdownComponents } from "../primitives/Markdown";
import { cn } from "../utils/cn";
import { useIntersectionCallback } from "../utils/use-visible";
import { AiChatAssistantMessage } from "./internal/AiChatAssistantMessage";
import { AiChatUserMessage } from "./internal/AiChatUserMessage";
import { AiComposer, type AiComposerProps } from "./internal/AiComposer";

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

export type AiChatComponents = {
  /**
   * The component used to render the empty state of the chat.
   */
  Empty: ComponentType<AiChatComponentsEmptyProps>;

  /**
   * The component used to render the loading state of the chat.
   */
  Loading: ComponentType<AiChatComponentsLoadingProps>;

  /**
   * The components used to render Markdown content.
   */
  markdown?: Partial<MarkdownComponents>;
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
   * The contextual knowledge to include in the chat. May be used by the
   * assistant when generating responses. In addition to the knowledge passed
   * in via this prop, the AiChat instance will also have access to any
   * globally registered knowledge via <RegisterAiKnowledge />.
   */
  knowledge?: AiKnowledgeSource[];

  /**
   * Tool definitions to make available within this chat. May be used by the assistant when generating responses.
   */
  tools?: Record<string, AiOpaqueToolDefinition>;

  /**
   * The event handler called when the composer is submitted.
   */
  onComposerSubmit?: AiComposerProps["onComposerSubmit"];

  /**
   * The layout of the chat and its composer.
   */
  layout?: "inset" | "compact";

  /**
   * The time, in milliseconds, before an AI response will timeout.
   */
  responseTimeout?: number;

  /**
   * Override the component's strings.
   */
  overrides?: Partial<
    GlobalOverrides &
      AiComposerOverrides &
      AiChatMessageOverrides &
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
  bottomTrailingMarkerRef: MutableRefObject<HTMLDivElement | null>;
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
      bottomTrailingMarkerRef,
      trailingSpacerRef,
      className,
      ...props
    },
    forwardedRef
  ) => {
    const hasLastSentMessage = lastSentMessageId !== null;

    /**
     * Every time the container, footer, or messages list change size,
     * we calculate the trailing space that would allow the penultimate
     * message to be at the top of the viewport, and apply it.
     *
     *   ┌─────────────────────────────────────────┐▲   A = The `scroll-margin-top`
     *   │            ┌─────────────────────────┐  │▼▲  value of the penultimate message
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
    useEffect(
      () => {
        if (!hasLastSentMessage) {
          return;
        }

        const container = containerRef.current;
        const footer = footerRef.current;
        const messages = messagesRef.current;

        if (!container || !footer || !messages) {
          return;
        }

        const trailingSpacer = trailingSpacerRef.current;
        const bottomTrailingMarker = bottomTrailingMarkerRef.current;

        let containerHeight: number | undefined = undefined;
        let footerHeight: number | undefined = undefined;
        let messagesHeight: number | undefined = undefined;

        const resetTrailingSpace = () => {
          trailingSpacer?.style.removeProperty("height");
          bottomTrailingMarker?.style.removeProperty("top");
        };

        const updateTrailingSpace = (
          updatedContainerHeight?: number,
          updatedFooterHeight?: number,
          updatedMessagesHeight?: number
        ) => {
          if (!trailingSpacer || !bottomTrailingMarker) {
            return;
          }

          const lastMessage = messages.lastElementChild;
          const penultimateMessage = lastMessage?.previousElementSibling;

          if (updatedContainerHeight === undefined) {
            updatedContainerHeight = container.getBoundingClientRect().height;
          }

          if (updatedFooterHeight === undefined) {
            updatedFooterHeight = footer.getBoundingClientRect().height;
          }

          if (updatedMessagesHeight === undefined) {
            updatedMessagesHeight = messages.getBoundingClientRect().height;
          }

          // If the heights haven't changed, there's no need to update the trailing space.
          if (
            updatedContainerHeight === containerHeight &&
            updatedFooterHeight === footerHeight &&
            updatedMessagesHeight === messagesHeight
          ) {
            if (
              !lastMessage ||
              !penultimateMessage ||
              container.scrollHeight === container.clientHeight
            ) {
              resetTrailingSpace();
            }
            return;
          }

          // Now that we have compared them, we can update the heights.
          containerHeight = updatedContainerHeight;
          footerHeight = updatedFooterHeight;
          messagesHeight = updatedMessagesHeight;

          // If there's no last pair of messages, there's no need for any trailing space.
          if (!lastMessage || !penultimateMessage) {
            resetTrailingSpace();
            return;
          }

          // If the container isn't scrollable, there's no need for trailing space.
          if (container.scrollHeight === container.clientHeight) {
            resetTrailingSpace();
            return;
          }

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
          bottomTrailingMarker.style.top = `${-trailingSpace}px`;
        };

        const resizeObserver = new ResizeObserver((entries) => {
          let updatedContainerHeight: number | undefined = containerHeight;
          let updatedFooterHeight: number | undefined = footerHeight;
          let updatedMessagesHeight: number | undefined = messagesHeight;

          for (const entry of entries) {
            const entryHeight =
              entry.borderBoxSize?.[0]?.blockSize ?? entry.contentRect.height;

            if (entry.target === container) {
              updatedContainerHeight = entryHeight;
            } else if (entry.target === footer) {
              updatedFooterHeight = entryHeight;
            } else if (entry.target === messages) {
              updatedMessagesHeight = entryHeight;
            }
          }

          updateTrailingSpace(
            updatedContainerHeight,
            updatedFooterHeight,
            updatedMessagesHeight
          );
        });

        resizeObserver.observe(container);
        resizeObserver.observe(footer);
        resizeObserver.observe(messages);

        // Initialize before the first resize.
        requestAnimationFrame(() => updateTrailingSpace());

        return () => {
          resizeObserver.disconnect();
          resetTrailingSpace();
        };
      },
      // This effect only uses stable refs.
      [hasLastSentMessage] // eslint-disable-line react-hooks/exhaustive-deps
    );

    /**
     * Update the "scroll at bottom" state when needed.
     */
    useIntersectionCallback(
      bottomTrailingMarkerRef,
      (isIntersecting) => {
        onScrollAtBottomChange.current(isIntersecting);
      },
      { root: containerRef, rootMargin: MIN_DISTANCE_BOTTOM_SCROLL_INDICATOR }
    );

    /**
     * Instantly scroll to the bottom for the initial state.
     */
    useEffect(
      () => {
        scrollToBottom.current("instant");
      },
      // `scrollToBottom` is a stable ref containing the callback.
      [] // eslint-disable-line react-hooks/exhaustive-deps
    );

    /**
     * Scroll to new messages when sending them.
     */
    useEffect(
      () => {
        if (lastSentMessageId) {
          scrollToBottom.current("smooth", true);
        }
      },
      // `scrollToBottom` is a stable ref containing the callback.
      [lastSentMessageId] // eslint-disable-line react-hooks/exhaustive-deps
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
                components={components}
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
      knowledge: localKnowledge,
      tools = {},
      onComposerSubmit,
      layout = "inset",
      components,
      className,
      responseTimeout,
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
    const bottomMarkerRef = useRef<HTMLDivElement | null>(null);
    const bottomTrailingMarkerRef = useRef<HTMLDivElement | null>(null);
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
        if (includeTrailingSpace) {
          // Scroll to the bottom marker to include the trailing space,
          // but wait for the next tick in case the trailing space hasn't
          // been updated yet. (e.g. when sending a new message)
          setTimeout(() => {
            bottomMarkerRef.current?.scrollIntoView({
              behavior,
              block: "end",
            });
          }, 0);
        } else {
          // Scroll to the trailing space marker to only scroll to the
          // bottom of the messages, without including the trailing space.
          bottomTrailingMarkerRef.current?.scrollIntoView({
            behavior,
            block: "end",
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
          `lb-ai-chat:layout-${layout}`,
          className
        )}
      >
        {Object.entries(tools).map(([name, tool]) => (
          <RegisterAiTool key={name} chatId={chatId} name={name} tool={tool} />
        ))}

        {localKnowledge
          ? localKnowledge.map((knowledge, index) => (
              <RegisterAiKnowledge
                key={`${index}:${knowledge.description}`}
                chatId={chatId}
                {...knowledge}
              />
            ))
          : null}

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
                bottomTrailingMarkerRef={bottomTrailingMarkerRef}
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
                  height: 0,
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
          <AiComposer
            key={chatId}
            chatId={chatId}
            copilotId={copilotId as CopilotId}
            overrides={overrides}
            autoFocus={autoFocus}
            responseTimeout={responseTimeout}
            onComposerSubmit={onComposerSubmit}
            onComposerSubmitted={({ id }) => setLastSentMessageId(id)}
            className={cn(
              "lb-ai-chat-composer",
              layout === "inset"
                ? "lb-elevation lb-elevation-moderate"
                : undefined
            )}
          />
        </div>

        {/**
         * This invisible marker is a trick which allows us to use IntersectionObserver to detect when the
         * scrollable area is fully scrolled to the bottom instead of manually tracking the scroll position
         * and having to deal with resizes, etc.
         *
         * It's positioned at the bottom of the scrollable area and reliably only becomes "visible" to the
         * IntersectionObserver when the scrollable area is scrolled to the bottom.
         */}
        {messages && messages.length > 0 ? (
          <div
            ref={bottomMarkerRef}
            style={{ position: "sticky", height: 0 }}
            aria-hidden
            data-bottom-marker=""
          >
            {/**
             * This inner marker is absolutely offset by the same distance as the trailing space so its
             * visibility means the scrollable area is at the bottom of the messages, not the full bottom.
             */}
            <div
              ref={bottomTrailingMarkerRef}
              style={{
                position: "absolute",
                height: 0,
              }}
              data-bottom-trailing-marker=""
            />
          </div>
        ) : null}
      </div>
    );
  }
);
