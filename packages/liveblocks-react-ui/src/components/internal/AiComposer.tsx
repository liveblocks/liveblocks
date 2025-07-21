import { type CopilotId, kInternal, type MessageId } from "@liveblocks/core";
import { useClient } from "@liveblocks/react";
import {
  type ComponentProps,
  type FormEvent,
  forwardRef,
  type SyntheticEvent,
  useCallback,
} from "react";

import { SendIcon } from "../../icons/Send";
import { StopIcon } from "../../icons/Stop";
import {
  type AiComposerOverrides,
  type GlobalOverrides,
  useOverrides,
} from "../../overrides";
import * as ComposerPrimitive from "../../primitives/AiComposer";
import { useAiComposer } from "../../primitives/AiComposer/contexts";
import type {
  AiComposerEditorProps,
  AiComposerFormProps,
  AiComposerSubmitMessage,
} from "../../primitives/AiComposer/types";
import { cn } from "../../utils/cn";
import { Button } from "./Button";
import { ShortcutTooltip, TooltipProvider } from "./Tooltip";

/* -------------------------------------------------------------------------------------------------
 * AiComposer
 * -----------------------------------------------------------------------------------------------*/
export interface AiComposerProps
  extends Omit<ComponentProps<"form">, "defaultValue"> {
  /**
   * The composer's initial value.
   */
  defaultValue?: string;

  /**
   * The event handler called when the composer is submitted.
   */
  onComposerSubmit?: (
    message: AiComposerSubmitMessage,
    event: FormEvent<HTMLFormElement>
  ) => void;

  /**
   * @internal
   * The event handler called after the composer is submitted.
   */
  onComposerSubmitted?: (message: {
    /**
     * The created message ID.
     */
    id: MessageId;
  }) => void;

  /**
   * Whether the composer is disabled.
   */
  disabled?: AiComposerFormProps["disabled"];

  /**
   * Whether to focus the composer on mount.
   */
  autoFocus?: AiComposerEditorProps["autoFocus"];

  /**
   * Override the component's strings.
   */
  overrides?: Partial<GlobalOverrides & AiComposerOverrides>;

  /**
   * The ID of the chat the composer belongs to.
   */
  chatId: string;

  /**
   * The ID of the copilot to use to send the message.
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
}

function AiComposerAction({
  overrides,
}: {
  overrides?: AiComposerProps["overrides"];
}) {
  const { canAbort } = useAiComposer();
  const $ = useOverrides(overrides);

  const preventDefault = useCallback((event: SyntheticEvent) => {
    event.preventDefault();
  }, []);

  const stopPropagation = useCallback((event: SyntheticEvent) => {
    event.stopPropagation();
  }, []);

  return canAbort ? (
    <ShortcutTooltip content={$.AI_COMPOSER_ABORT}>
      <ComposerPrimitive.Abort asChild>
        <Button
          onPointerDown={preventDefault}
          onClick={stopPropagation}
          className="lb-ai-composer-action"
          variant="secondary"
          aria-label={$.AI_COMPOSER_ABORT}
          icon={<StopIcon />}
        />
      </ComposerPrimitive.Abort>
    </ShortcutTooltip>
  ) : (
    <ShortcutTooltip content={$.AI_COMPOSER_SEND} shortcut="Enter">
      <ComposerPrimitive.Submit asChild>
        <Button
          onPointerDown={preventDefault}
          onClick={stopPropagation}
          className="lb-ai-composer-action"
          variant="primary"
          aria-label={$.AI_COMPOSER_SEND}
          icon={<SendIcon />}
        />
      </ComposerPrimitive.Submit>
    </ShortcutTooltip>
  );
}

export const AiComposer = forwardRef<HTMLFormElement, AiComposerProps>(
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
      stream = true,
      onComposerSubmitted,
      ...props
    },
    forwardedRef
  ) => {
    const $ = useOverrides(overrides);
    const client = useClient();

    const handleComposerSubmit = useCallback(
      (message: AiComposerSubmitMessage, event: FormEvent<HTMLFormElement>) => {
        onComposerSubmit?.(message, event);

        if (event.isDefaultPrevented()) return;

        const content = [{ type: "text" as const, text: message.text }];

        const newMessageId = client[kInternal].ai[
          kInternal
        ].context.messagesStore.createOptimistically(
          chatId,
          "user",
          message.lastMessageId ?? null,
          content
        );

        onComposerSubmitted?.({ id: newMessageId });

        const targetMessageId = client[kInternal].ai[
          kInternal
        ].context.messagesStore.createOptimistically(
          chatId,
          "assistant",
          newMessageId
        );

        client[kInternal].ai.askUserMessageInChat(
          chatId,
          {
            id: newMessageId,
            parentMessageId: message.lastMessageId ?? null,
            content,
          },
          targetMessageId,
          {
            stream,
            copilotId,
          }
        );
      },
      [onComposerSubmit, chatId, client, copilotId, stream, onComposerSubmitted]
    );

    return (
      <TooltipProvider>
        <ComposerPrimitive.Form
          className={cn(
            "lb-root lb-ai-composer lb-ai-composer-form",
            className
          )}
          dir={$.dir}
          {...props}
          disabled={disabled}
          ref={forwardedRef}
          onComposerSubmit={handleComposerSubmit}
          chatId={chatId}
          branchId={branchId}
        >
          <div className="lb-ai-composer-editor-container">
            <ComposerPrimitive.Editor
              autoFocus={autoFocus}
              className="lb-ai-composer-editor"
              placeholder={$.AI_COMPOSER_PLACEHOLDER}
              defaultValue={defaultValue}
            />

            <div className="lb-ai-composer-footer">
              <div className="lb-ai-composer-editor-actions">
                {/* No actions for now but it makes sense to keep the DOM structure */}
              </div>

              <div className="lb-ai-composer-actions">
                <AiComposerAction overrides={overrides} />
              </div>
            </div>
          </div>
        </ComposerPrimitive.Form>
      </TooltipProvider>
    );
  }
);
