import {
  type AiChatContext,
  type ClientToolDefinition,
  type CopilotId,
  kInternal,
  type UiChatMessage,
} from "@liveblocks/core";
import { useAiChatMessages, useClient } from "@liveblocks/react";
import { useLayoutEffect } from "@liveblocks/react/_private";
import {
  type ComponentProps,
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";

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
import { AiChatAssistantMessage } from "./internal/AiChatAssistantMessage";
import { AiChatComposer } from "./internal/AiChatComposer";
import { AiChatUserMessage } from "./internal/AiChatUserMessage";

/**
 * The number of pixels from the bottom of the messages list to trigger the scroll to bottom.
 */
const MIN_DISTANCE_TO_BOTTOM = 50;

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
   * The layout of the chat and its composer.
   */
  layout?: "inset" | "compact";
  /**
   * The contextual information to include in the chat. Used by the assistant when generating responses.
   */
  contexts?: AiChatContext[];
  /**
   * The contextual information to include in the chat. Used by the assistant when generating responses.
   */
  tools?: Record<string, ClientToolDefinition>;
  /**
   * Override the component's strings.
   */
  overrides?: Partial<
    GlobalOverrides &
      AiChatMessageOverrides &
      AiChatComposerOverrides &
      AiChatOverrides
  >;
}

export const AiChat = forwardRef<HTMLDivElement, AiChatProps>(
  (
    {
      chatId,
      copilotId,
      autoFocus,
      layout = "inset",
      overrides,
      contexts = [],
      tools = {},
      className,
      ...props
    },
    forwardedRef
  ) => {
    const { messages, isLoading, error } = useAiChatMessages(chatId);
    const $ = useOverrides(overrides);
    const containerRef = useRef<HTMLDivElement | null>(null);
    const [distanceToBottom, setDistanceToBottom] = useState<number | null>(
      null
    );
    const client = useClient();

    useImperativeHandle<HTMLDivElement | null, HTMLDivElement | null>(
      forwardedRef,
      () => containerRef.current,
      []
    );

    // Add the provided contextual information to the chat on mount and remove on unmount
    // Note: 'contexts' will most likely be a new object on each render (unless user passes a stable object), but this won't be an issue as context addition and removal is a quick operation
    useEffect(() => {
      const unregister = contexts.map((context) =>
        client[kInternal].ai.registerChatContext(chatId, context)
      );
      return () => {
        unregister.forEach((unregister) => unregister());
      };
    }, [client, chatId, contexts]);

    // Register the provided tools to the chat on mount and unregister them on unmount
    useEffect(() => {
      Object.entries(tools).map(([key, value]) =>
        client[kInternal].ai.registerChatTool(chatId, key, value)
      );
      return () => {
        Object.entries(tools).map(([key]) =>
          client[kInternal].ai.unregisterChatTool(chatId, key)
        );
      };
    }, [client, chatId, tools]);

    useEffect(() => {
      const container = containerRef.current;
      if (container === null) return;
      function handleScrollChange() {
        const container = containerRef.current;
        if (container === null) return;

        setDistanceToBottom(
          container.scrollHeight - container.clientHeight - container.scrollTop
        );
      }
      container.addEventListener("scroll", handleScrollChange);
      return () => {
        container.removeEventListener("scroll", handleScrollChange);
      };
    }, []);

    useEffect(() => {
      const container = containerRef.current;
      if (container === null) return;

      setDistanceToBottom(
        container.scrollHeight - container.clientHeight - container.scrollTop
      );
    }, [messages]);

    useEffect(() => {
      const container = containerRef.current;
      if (container === null) return;

      const distanceToBottom =
        container.scrollHeight - container.clientHeight - container.scrollTop;

      if (messages === undefined) return;
      const lastMessage = messages[messages.length - 1];
      if (lastMessage !== undefined && lastMessage.role === "user") {
        container.scrollTo({
          top: container.scrollHeight,
          behavior: "smooth",
        });
      } else if (distanceToBottom <= MIN_DISTANCE_TO_BOTTOM) {
        container.scrollTo({
          top: container.scrollHeight,
          behavior: "smooth",
        });
      }
    }, [messages]);

    useEffect(() => {
      const container = containerRef.current;
      if (container === null) return;

      const observer = new ResizeObserver(() => {
        const container = containerRef.current;
        if (container === null) return;
        setDistanceToBottom(
          container.scrollHeight - container.clientHeight - container.scrollTop
        );
      });
      observer.observe(container);
      return () => {
        observer.disconnect();
      };
    }, []);

    const scrollToBottomCallbackRef = useRef<() => void>(undefined);
    if (scrollToBottomCallbackRef.current === undefined) {
      scrollToBottomCallbackRef.current = function () {
        const container = containerRef.current;
        if (container === null) return;

        container.scrollTo({
          top: container.scrollHeight,
          behavior: "instant",
        });
      };
    }
    const isScrollIndicatorVisible =
      distanceToBottom !== null && distanceToBottom > MIN_DISTANCE_TO_BOTTOM;

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
            <div className="lb-ai-chat-messages">
              <Messages
                messages={messages}
                overrides={$}
                onDistanceToBottomChange={scrollToBottomCallbackRef.current}
              />
            </div>
          )}
        </div>

        <div className="lb-ai-chat-footer">
          <div className="lb-ai-chat-footer-actions">
            <div
              className="lb-elevation lb-ai-chat-scroll-indicator"
              data-visible={isScrollIndicatorVisible ? "" : undefined}
            >
              <button
                className="lb-ai-chat-scroll-indicator-button"
                tabIndex={isScrollIndicatorVisible ? 0 : -1}
                aria-hidden={!isScrollIndicatorVisible}
                disabled={!isScrollIndicatorVisible}
                onClick={() => {
                  const container = containerRef.current;
                  if (container === null) return;

                  container.scrollTo({
                    top: container.scrollHeight,
                    behavior: "smooth",
                  });
                }}
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
          />
        </div>
      </div>
    );
  }
);

function Messages({
  messages,
  overrides,
  onDistanceToBottomChange,
}: {
  messages: readonly UiChatMessage[];
  overrides: Partial<GlobalOverrides & AiChatMessageOverrides>;
  onDistanceToBottomChange: () => void;
}) {
  const $ = useOverrides(overrides);

  useLayoutEffect(() => {
    onDistanceToBottomChange();
  }, [onDistanceToBottomChange]);

  return messages.map((message) => {
    if (message.role === "user") {
      return (
        <AiChatUserMessage key={message.id} message={message} overrides={$} />
      );
    } else if (message.role === "assistant") {
      return (
        <AiChatAssistantMessage
          key={message.id}
          message={message}
          overrides={$}
        />
      );
    } else {
      return null;
    }
  });
}
