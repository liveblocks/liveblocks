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
  forwardRef,
  type HTMLAttributes,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";

import { ChevronDownIcon } from "../../icons/ChevronDown";
import { SpinnerIcon } from "../../icons/Spinner";
import {
  type ChatComposerOverrides,
  type ChatMessageOverrides,
  type ChatOverrides,
  type GlobalOverrides,
  useOverrides,
} from "../../overrides";
import { classNames } from "../../utils/class-names";
import { AiChatAssistantMessage } from "../internal/AiChatAssistantMessage";
import { AiChatComposer } from "../internal/AiChatComposer";
import { AiChatUserMessage } from "../internal/AiChatUserMessage";

/**
 * The number of pixels from the bottom of the messages list to trigger the scroll to bottom.
 */
// const BOTTOM_THRESHOLD = 50;

export type AiChatProps = HTMLAttributes<HTMLDivElement> & {
  /**
   * The id of the chat the composer belongs to.
   */
  chatId: string;
  /**
   * The id of the copilot to use to send the message.
   */
  copilotId?: CopilotId;
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
      ChatMessageOverrides &
      ChatComposerOverrides &
      ChatOverrides
  >;
};
export const AiChat = forwardRef<HTMLDivElement, AiChatProps>(function (
  {
    chatId,
    copilotId,
    overrides,
    contexts = [],
    tools = {},
    className,
    ...props
  },
  forwardedRef
) {
  const { messages, isLoading, error } = useAiChatMessages(chatId);
  const $ = useOverrides(overrides);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [distanceToBottom, setDistanceToBottom] = useState<number | null>(null);
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

  const scrollToBottomCallbackRef = useRef<() => void>(undefined);
  if (scrollToBottomCallbackRef.current === undefined) {
    scrollToBottomCallbackRef.current = function () {
      const container = containerRef.current;
      if (container === null) return;

      container.scrollTo({
        top: container.scrollHeight,
        behavior: "instant",
      });
      setDistanceToBottom(
        container.scrollHeight - container.clientHeight - container.scrollTop
      );
    };
  }

  return (
    <div
      ref={containerRef}
      {...props}
      className={classNames("lb-root lb-ai-chat", className)}
    >
      {isLoading ? (
        <div className="lb-ai-chat-loading lb-loading">
          <SpinnerIcon />
        </div>
      ) : error !== undefined ? (
        <div className="lb-ai-chat-error lb-error">
          {$.GET_CHAT_MESSAGES_ERROR(error)}
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

      <div className="lb-ai-chat-footer">
        <div className="lb-ai-chat-footer-actions">
          <button
            className="lb-ai-chat-scroll-button lb-button"
            data-visible={
              distanceToBottom !== null && distanceToBottom > BOTTOM_THRESHOLD
                ? ""
                : undefined
            }
            data-variant="secondary"
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
              <ChevronDownIcon />
            </span>
          </button>
        </div>
        <AiChatComposer
          key={chatId}
          chatId={chatId}
          copilotId={copilotId}
          className="lb-ai-chat-composer"
          overrides={$}
          onComposerSubmit={() => {
            const container = containerRef.current;
            if (container === null) return;
            container.scrollTo({
              top: container.scrollHeight,
              behavior: "smooth",
            });
          }}
        />
      </div>
    </div>
  );
});

function Messages({
  messages,
  overrides,
  onDistanceToBottomChange,
}: {
  messages: readonly UiChatMessage[];
  overrides: Partial<GlobalOverrides & ChatMessageOverrides>;
  onDistanceToBottomChange: () => void;
}) {
  const $ = useOverrides(overrides);

  useLayoutEffect(() => {
    onDistanceToBottomChange();
  }, [onDistanceToBottomChange]);

  return messages.map((message) => {
    if (message.role === "user") {
      return (
        <AiChatUserMessage
          key={message.id}
          message={message}
          overrides={$}
          className="lb-ai-chat-messages-user-message"
        />
      );
    } else if (message.role === "assistant") {
      return (
        <AiChatAssistantMessage
          key={message.id}
          message={message}
          overrides={$}
          className="lb-ai-chat-messages-assistant-message"
        />
      );
    } else {
      return null;
    }
  });
}

/**
 * The number of pixels from the bottom of the messages list to trigger the scroll to bottom.
 */
const BOTTOM_THRESHOLD = 50;
