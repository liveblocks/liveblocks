import type {
  AiKnowledgeSource,
  ClientToolDefinition,
  CopilotId,
  MessageId,
  UiChatMessage,
} from "@liveblocks/core";
import { kInternal } from "@liveblocks/core";
import { useAiChatMessages, useClient } from "@liveblocks/react";
import { useLayoutEffect } from "@liveblocks/react/_private";
import {
  type ComponentProps,
  forwardRef,
  useEffect,
  useId,
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
import { RegisterAiKnowledge } from "./RegisterAiKnowledge";

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
   * The contextual knowledge to include in the chat. May be used by the assistant when generating responses.
   */
  knowledgeSources?: AiKnowledgeSource[];
  /**
   * Tool definitions to make available within this chat. May be used by the assistant when generating responses.
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
      overrides,
      knowledgeSources,
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

      container.scrollTo({
        top: container.scrollHeight,
        behavior: "smooth",
      });
    }, [lastSendMessageId]);

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
        className={classNames("lb-root lb-ai-chat", className)}
      >
        {knowledgeSources
          ? knowledgeSources.map((source, index) => (
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
            onUserMessageCreate={({ id }) => setLastSendMessageId(id)}
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
