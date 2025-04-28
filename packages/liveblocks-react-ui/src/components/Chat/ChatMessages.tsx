import type { UiChatMessage } from "@liveblocks/core";
import {
  forwardRef,
  type HTMLAttributes,
  useImperativeHandle,
  useRef,
} from "react";

import {
  type ChatMessageOverrides,
  type GlobalOverrides,
  useOverrides,
} from "../../overrides";
import { classNames } from "../../utils/class-names";
import { AssistantChatMessage } from "./AssistantMessage";
import { UserChatMessage } from "./UserMessage";

export type ChatMessagesProps = HTMLAttributes<HTMLDivElement> & {
  /**
   * The messages to display.
   */
  messages: readonly UiChatMessage[];
  /**
   * Override the component's strings.
   */
  overrides?: Partial<GlobalOverrides & ChatMessageOverrides>;
};
export const ChatMessages = forwardRef<HTMLDivElement, ChatMessagesProps>(
  function ({ messages, overrides, className, ...props }, forwardedRef) {
    const containerRef = useRef<HTMLDivElement>(null);
    const $ = useOverrides(overrides);

    useImperativeHandle<HTMLDivElement | null, HTMLDivElement | null>(
      forwardedRef,
      () => containerRef.current,
      []
    );

    return (
      <div
        ref={containerRef}
        {...props}
        className={classNames("lb-root lb-chat-messages", className)}
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
  }
);
