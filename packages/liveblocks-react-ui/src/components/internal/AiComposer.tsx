import {
  type AiChatMessage,
  type AiKnowledgeSource,
  type CopilotId,
  type MessageId,
} from "@liveblocks/core";
import {
  useSendAiMessage,
  type UseSendAiMessageOptions,
} from "@liveblocks/react";
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
import * as AiComposerPrimitive from "../../primitives/AiComposer";
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
   * The event handler called after the composer is submitted.
   *
   * @internal This API will change, and is not considered stable. DO NOT RELY on it.
   */
  onComposerSubmitted?: (message: AiChatMessage) => void;

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
  knowledge?: AiKnowledgeSource[];

  /**
   * @internal
   */
  branchId?: MessageId;

  /**
   * @internal
   */
  stream?: boolean;

  /**
   * The timeout for the AI response
   */
  timeout?: number;
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
      <AiComposerPrimitive.Abort asChild>
        <Button
          onPointerDown={preventDefault}
          onClick={stopPropagation}
          className="lb-ai-composer-action"
          variant="secondary"
          aria-label={$.AI_COMPOSER_ABORT}
          icon={<StopIcon />}
        />
      </AiComposerPrimitive.Abort>
    </ShortcutTooltip>
  ) : (
    <ShortcutTooltip content={$.AI_COMPOSER_SEND} shortcut="Enter">
      <AiComposerPrimitive.Submit asChild>
        <Button
          onPointerDown={preventDefault}
          onClick={stopPropagation}
          className="lb-ai-composer-action"
          variant="primary"
          aria-label={$.AI_COMPOSER_SEND}
          icon={<SendIcon />}
        />
      </AiComposerPrimitive.Submit>
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
      knowledge: localKnowledge,
      branchId,
      copilotId,
      timeout,
      stream = true,
      onComposerSubmitted,
      ...props
    },
    forwardedRef
  ) => {
    const $ = useOverrides(overrides);
    const sendAiMessage = useSendAiMessage(chatId, {
      stream,
      copilotId,
      timeout,
      // TODO: We shouldn't need to pass knowledge from AiChat to AiComposer
      //       to useSendAiMessage, ideally it would be attached to a chat ID
      //       behind the scenes inside AiChat.
      knowledge: localKnowledge,
    } as UseSendAiMessageOptions);

    const handleComposerSubmit = useCallback(
      (message: AiComposerSubmitMessage, event: FormEvent<HTMLFormElement>) => {
        onComposerSubmit?.(message, event);

        if (event.isDefaultPrevented()) return;

        const newMessage = sendAiMessage(message.text);

        onComposerSubmitted?.(newMessage);
      },
      [onComposerSubmit, sendAiMessage, onComposerSubmitted]
    );

    return (
      <TooltipProvider>
        <AiComposerPrimitive.Form
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
            <AiComposerPrimitive.Editor
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
        </AiComposerPrimitive.Form>
      </TooltipProvider>
    );
  }
);
