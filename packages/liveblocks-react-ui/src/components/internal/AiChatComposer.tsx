import type { CopilotId, MessageId, UiChatMessage } from "@liveblocks/core";
import { kInternal } from "@liveblocks/core";
import { useClient } from "@liveblocks/react";
import { useSignal } from "@liveblocks/react/_private";
import {
  type FormEvent,
  type FormHTMLAttributes,
  forwardRef,
  useCallback,
} from "react";

import { ShortcutTooltip, TooltipProvider } from "../../_private";
import {
  type ChatComposerOverrides,
  type GlobalOverrides,
  useOverrides,
} from "../../overrides";
import * as ComposerPrimitive from "../../primitives/Chat/Composer";
import { classNames } from "../../utils/class-names";

/* -------------------------------------------------------------------------------------------------
 * AiChatComposer
 * -----------------------------------------------------------------------------------------------*/
export type AiChatComposerProps = FormHTMLAttributes<HTMLFormElement> & {
  /**
   * The composer's initial value.
   */
  defaultValue?: string;
  /**
   * The event handler called when a chat message is submitted.
   */
  onComposerSubmit?: (
    message: {
      /**
       * The submitted message text.
       */
      text: string;
    },
    event: FormEvent<HTMLFormElement>
  ) => void;
  /**
   * Whether the composer is disabled.
   */
  disabled?: boolean;
  /**
   * Override the component's strings.
   */
  overrides?: Partial<GlobalOverrides & ChatComposerOverrides>;
  /**
   * The id of the chat the composer belongs to.
   */
  chatId: string;
  /**
   * The id of the copilot to use to send the message.
   */
  copilotId?: CopilotId;
  /**
   * @internal
   */
  branchId?: MessageId;
  /**
   * @internal
   */
  stream?: boolean;
};

export const AiChatComposer = forwardRef<HTMLFormElement, AiChatComposerProps>(
  (
    {
      defaultValue,
      onComposerSubmit,
      disabled,
      overrides,
      className,
      chatId,
      branchId,
      copilotId,
      stream = true,
      ...props
    },
    forwardedRef
  ) => {
    const $ = useOverrides(overrides);
    const client = useClient();

    const getLastMessageId = useCallback((messages: UiChatMessage[]) => {
      const lastMessage = messages[messages.length - 1];
      if (lastMessage === undefined) return null;
      return lastMessage.id;
    }, []);

    const getPendingMessage = useCallback((messages: UiChatMessage[]) => {
      return messages.find(
        (m) => m.role === "assistant" && m.status === "pending"
      )?.id;
    }, []);

    const pendingMessage = useSignal(
      client[kInternal].ai.signals.getChatMessagesForBranchΣ(chatId, branchId),
      getPendingMessage
    );

    const lastMessageId = useSignal(
      client[kInternal].ai.signals.getChatMessagesForBranchΣ(chatId, branchId),
      getLastMessageId
    );

    const handleComposerSubmit = useCallback(
      (message: { text: string }, event: FormEvent<HTMLFormElement>) => {
        if (pendingMessage !== undefined) {
          event.preventDefault();
          return;
        }

        onComposerSubmit?.(message, event);
        if (event.isDefaultPrevented()) return;

        client[kInternal].ai.addUserMessageAndAsk(
          chatId,
          lastMessageId,
          message.text,
          {
            stream,
            copilotId,
          }
        );
      },
      [
        onComposerSubmit,
        client,
        chatId,
        lastMessageId,
        pendingMessage,
        stream,
        copilotId,
      ]
    );

    return (
      <TooltipProvider>
        <ComposerPrimitive.Form
          className={classNames("lb-ai-chat-composer-form", className)}
          chatId={chatId}
          dir={$.dir}
          {...props}
          disabled={disabled}
          ref={forwardedRef}
          onComposerSubmit={handleComposerSubmit}
        >
          <div className="lb-ai-chat-composer-editor-container">
            <ComposerPrimitive.Editor
              autoFocus
              className="lb-ai-chat-composer-editor"
              placeholder={$.CHAT_COMPOSER_PLACEHOLDER}
              defaultValue={defaultValue}
            />

            <div className="lb-ai-chat-composer-footer">
              <div className="lb-ai-chat-composer-editor-actions" />

              <div className="lb-ai-chat-composer-actions">
                {pendingMessage === undefined ? (
                  <ShortcutTooltip
                    content={$.CHAT_COMPOSER_SEND}
                    shortcut="Enter"
                  >
                    <ComposerPrimitive.Submit
                      className="lb-button lb-ai-chat-composer-action"
                      data-variant="primary"
                      data-size="default"
                      aria-label={$.CHAT_COMPOSER_SEND}
                      onPointerDown={(event) => event.preventDefault()}
                      onClick={(event) => event.stopPropagation()}
                    >
                      <span className="lb-icon-container">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width={20}
                          height={20}
                          viewBox={`0 0 ${20} ${20}`}
                          fill="none"
                          stroke="currentColor"
                          strokeWidth={1.5}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          role="presentation"
                          className="lb-icon"
                        >
                          <path d="m5 16 12-6L5 4l2 6-2 6ZM7 10h10" />
                        </svg>
                      </span>
                    </ComposerPrimitive.Submit>
                  </ShortcutTooltip>
                ) : (
                  <ShortcutTooltip content={$.CHAT_COMPOSER_ABORT}>
                    <button
                      type="button"
                      className="lb-button lb-ai-chat-composer-action"
                      data-variant="primary"
                      data-size="default"
                      aria-label={$.CHAT_COMPOSER_ABORT}
                      onPointerDown={(event) => event.preventDefault()}
                      onClick={(event) => {
                        event.stopPropagation();
                        client[kInternal].ai.abort(pendingMessage);
                      }}
                    >
                      <span className="lb-icon-container">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width={20}
                          height={20}
                          viewBox="0 0 20 20"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth={1.5}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          role="presentation"
                          className="lb-icon"
                        >
                          <rect
                            x={5}
                            y={5}
                            width={10}
                            height={10}
                            rx={1}
                            fill="currentColor"
                          />
                        </svg>
                      </span>
                    </button>
                  </ShortcutTooltip>
                )}
              </div>
            </div>
          </div>
        </ComposerPrimitive.Form>
      </TooltipProvider>
    );
  }
);
