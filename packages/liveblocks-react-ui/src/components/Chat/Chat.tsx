import type {
  ChatContext,
  ClientToolDefinition,
  CopilotId,
  UiChatMessage,
} from "@liveblocks/core";
import { useChatMessages, useClient } from "@liveblocks/react";
import { useLayoutEffect } from "@liveblocks/react/_private";
import {
  forwardRef,
  type HTMLAttributes,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";

import { SpinnerIcon } from "../../icons/Spinner";
import {
  type ChatComposerOverrides,
  type ChatMessageOverrides,
  type ChatOverrides,
  type GlobalOverrides,
  useOverrides,
} from "../../overrides";
import { classNames } from "../../utils/class-names";
import { AssistantChatMessage } from "./AssistantChatMessage";
import { ChatComposer } from "./ChatComposer";
import { UserChatMessage } from "./UserChatMessage";

/**
 * The number of pixels from the bottom of the messages list to trigger the scroll to bottom.
 */
// const BOTTOM_THRESHOLD = 50;

export type ChatProps = HTMLAttributes<HTMLDivElement> & {
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
  contexts?: ChatContext[];
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
export const Chat = forwardRef<HTMLDivElement, ChatProps>(function (
  {
    chatId,
    copilotId,
    contexts = [],
    tools = {},
    overrides,
    className,
    ...props
  },
  forwardedRef
) {
  const { messages, isLoading, error } = useChatMessages(chatId);
  const $ = useOverrides(overrides);
  const client = useClient();

  // Add the provided contextual information to the chat on mount and remove on unmount
  // Note: 'contexts' will most likely be a new object on each render (unless user passes a stable object), but this won't be an issue as context addition and removal is a quick operation
  useEffect(() => {
    const unregister = contexts.map((context) =>
      client.ai.registerChatContext(chatId, context)
    );
    return () => {
      unregister.forEach((unregister) => unregister());
    };
  }, [client, chatId, contexts]);

  // Register the provided tools to the chat on mount and unregister them on unmount
  useEffect(() => {
    Object.entries(tools).map(([key, value]) =>
      client.ai.registerChatTool(chatId, key, value)
    );
    return () => {
      Object.entries(tools).map(([key]) =>
        client.ai.unregisterChatTool(chatId, key)
      );
    };
  }, [client, chatId, tools]);

  return (
    <div
      ref={forwardedRef}
      {...props}
      className={classNames("lb-root lb-chat", className)}
    >
      {isLoading ? (
        <div className="lb-chat-loading lb-loading">
          <SpinnerIcon />
        </div>
      ) : error !== undefined ? (
        <div className="lb-chat-error lb-error">
          {$.GET_CHAT_MESSAGES_ERROR(error)}
        </div>
      ) : (
        <ChatMessages messages={messages} overrides={$} />
      )}

      <div className="lb-chat-composer-container">
        <ChatComposer
          chatId={chatId}
          copilotId={copilotId}
          className="lb-chat-composer"
          overrides={$}
          disabled={isLoading || error !== undefined}
        />
      </div>
    </div>
  );
});

type ChatMessagesProps = HTMLAttributes<HTMLDivElement> & {
  messages: readonly UiChatMessage[];
  overrides?: Partial<GlobalOverrides & ChatMessageOverrides>;
};
const ChatMessages = forwardRef<HTMLDivElement, ChatMessagesProps>(function (
  { messages, overrides, className, ...props },
  forwardedRef
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const $ = useOverrides(overrides);
  const [_distanceToBottom, setDistanceToBottom] = useState<number | null>(
    null
  );

  useImperativeHandle<HTMLDivElement | null, HTMLDivElement | null>(
    forwardedRef,
    () => containerRef.current,
    []
  );

  // Scroll to the bottom of the chat on mount
  useEffect(() => {
    const container = containerRef.current;
    if (container === null) return;

    container.scrollTo({
      top: container.scrollHeight,
      behavior: "instant",
    });
  }, []);

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (container === null) return;

    setDistanceToBottom(
      container.scrollHeight - container.clientHeight - container.scrollTop
    );
  }, []);

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

  return (
    <div
      ref={containerRef}
      {...props}
      className={classNames("lb-chat-messages", className)}
    >
      {messages.map((message) => {
        if (message.role === "user") {
          return (
            <UserChatMessage
              key={message.id}
              message={message}
              overrides={$}
              className="lb-chat-messages-user-message"
            />
          );
        } else if (message.role === "assistant") {
          return (
            <AssistantChatMessage
              key={message.id}
              message={message}
              overrides={$}
              className="lb-chat-messages-assistant-message"
            />
          );
        } else {
          return null;
        }
      })}
    </div>
  );
});
