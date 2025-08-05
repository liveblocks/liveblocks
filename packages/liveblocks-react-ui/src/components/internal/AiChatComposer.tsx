import type {
  AiChatMessage,
  AiKnowledgeSource,
  CopilotId,
  MessageId,
  WithNavigation,
} from "@liveblocks/core";
import { kInternal } from "@liveblocks/core";
import { useClient } from "@liveblocks/react";
import { useSignal } from "@liveblocks/react/_private";
import {
  type ComponentProps,
  type FormEvent,
  forwardRef,
  useCallback,
} from "react";

import { SendIcon } from "../../icons/Send";
import { StopIcon } from "../../icons/Stop";
import {
  type AiChatComposerOverrides,
  type GlobalOverrides,
  useOverrides,
} from "../../overrides";
import * as ComposerPrimitive from "../../primitives/AiChatComposer";
import { cn } from "../../utils/cn";
import { Button } from "./Button";
import { ShortcutTooltip, TooltipProvider } from "./Tooltip";

type UiChatMessage = WithNavigation<AiChatMessage>;

/* -------------------------------------------------------------------------------------------------
 * AiChatComposer
 * -----------------------------------------------------------------------------------------------*/
export interface AiChatComposerProps extends ComponentProps<"form"> {
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
   * @internal
   * The event handler called when a user chat message is created optimistically.
   */
  onUserMessageCreate?: (message: {
    /**
     * The created user message id.
     */
    id: MessageId;
  }) => void;
  /**
   * Whether the composer is disabled.
   */
  disabled?: boolean;
  /**
   * Whether to focus the editor on mount.
   */
  autoFocus?: boolean;
  /**
   * Override the component's strings.
   */
  overrides?: Partial<GlobalOverrides & AiChatComposerOverrides>;
  /**
   * The id of the chat the composer belongs to.
   */
  chatId: string;
  /**
   * The id of the copilot to use to send the message.
   */
  copilotId?: CopilotId;
  /**
   * The contextual knowledge to include in the chat. May be used by the
   * assistant when generating responses. In addition to the knowledge passed
   * in via this prop, the AiChat instance will also have access to any
   * globally registered knowledge via <RegisterAiKnowledge />.
   */
  knowledge?: AiKnowledgeSource[];
  /**
   * @internal
   */
  branchId?: MessageId;
  /**
   * @internal
   */
  stream?: boolean;
}

export const AiChatComposer = forwardRef<HTMLFormElement, AiChatComposerProps>(
  (
    {
      defaultValue,
      onComposerSubmit,
      disabled,
      autoFocus,
      overrides,
      className,
      chatId,
      branchId,
      copilotId,
      knowledge: localKnowledge,
      stream = true,
      onUserMessageCreate,
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

    const getAbortableMessageId = useCallback((messages: UiChatMessage[]) => {
      return messages.find(
        (m) =>
          m.role === "assistant" &&
          (m.status === "generating" || m.status === "awaiting-tool")
      )?.id;
    }, []);

    const messagesΣ = client[kInternal].ai.signals.getChatMessagesForBranchΣ(
      chatId,
      branchId
    );

    const abortableMessageId = useSignal(messagesΣ, getAbortableMessageId);
    const lastMessageId = useSignal(messagesΣ, getLastMessageId);

    const handleComposerSubmit = useCallback(
      (message: { text: string }, event: FormEvent<HTMLFormElement>) => {
        if (abortableMessageId !== undefined) {
          event.preventDefault();
          return;
        }

        onComposerSubmit?.(message, event);
        if (event.isDefaultPrevented()) return;

        const content = [{ type: "text" as const, text: message.text }];
        const newMessageId = client[kInternal].ai[
          kInternal
        ].context.messagesStore.createOptimistically(
          chatId,
          "user",
          lastMessageId,
          content
        );
        onUserMessageCreate?.({ id: newMessageId });

        const targetMessageId = client[kInternal].ai[
          kInternal
        ].context.messagesStore.createOptimistically(
          chatId,
          "assistant",
          newMessageId
        );

        client[kInternal].ai.askUserMessageInChat(
          chatId,
          { id: newMessageId, parentMessageId: lastMessageId, content },
          targetMessageId,
          {
            stream,
            copilotId,
            knowledge: localKnowledge,
          }
        );
      },
      [
        onComposerSubmit,
        onUserMessageCreate,
        client,
        chatId,
        lastMessageId,
        abortableMessageId,
        stream,
        copilotId,
        localKnowledge,
      ]
    );

    return (
      <TooltipProvider>
        <ComposerPrimitive.Form
          className={cn(
            "lb-root lb-ai-chat-composer lb-ai-chat-composer-form",
            className
          )}
          dir={$.dir}
          {...props}
          disabled={disabled}
          ref={forwardedRef}
          onComposerSubmit={handleComposerSubmit}
        >
          <div className="lb-ai-chat-composer-editor-container">
            <ComposerPrimitive.Editor
              autoFocus={autoFocus}
              className="lb-ai-chat-composer-editor"
              placeholder={$.AI_CHAT_COMPOSER_PLACEHOLDER}
              defaultValue={defaultValue}
            />

            <div className="lb-ai-chat-composer-footer">
              <div className="lb-ai-chat-composer-editor-actions">
                {/* No actions for now but it makes sense to keep the DOM structure */}
              </div>

              <div className="lb-ai-chat-composer-actions">
                {abortableMessageId === undefined ? (
                  <ShortcutTooltip
                    content={$.AI_CHAT_COMPOSER_SEND}
                    shortcut="Enter"
                  >
                    <ComposerPrimitive.Submit asChild>
                      <Button
                        onPointerDown={(event) => event.preventDefault()}
                        onClick={(event) => event.stopPropagation()}
                        className="lb-ai-chat-composer-action"
                        variant="primary"
                        aria-label={$.AI_CHAT_COMPOSER_SEND}
                        icon={<SendIcon />}
                      />
                    </ComposerPrimitive.Submit>
                  </ShortcutTooltip>
                ) : (
                  <ShortcutTooltip content={$.AI_CHAT_COMPOSER_ABORT}>
                    <Button
                      onPointerDown={(event) => event.preventDefault()}
                      onClick={(event) => {
                        event.stopPropagation();
                        client[kInternal].ai.abort(abortableMessageId);
                      }}
                      className="lb-ai-chat-composer-action"
                      variant="secondary"
                      aria-label={$.AI_CHAT_COMPOSER_ABORT}
                      icon={<StopIcon />}
                    />
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
