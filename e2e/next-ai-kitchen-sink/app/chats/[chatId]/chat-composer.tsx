import { CopilotId, kInternal, MessageId } from "@liveblocks/core";
import { useClient } from "@liveblocks/react";
import { AiComposer } from "@liveblocks/react-ui/_private";
import { FormEvent, useCallback } from "react";
import { SendIcon } from "../../icons/send-icon";
import { StopIcon } from "../../icons/stop-icon";

export function ChatComposer({
  chatId,
  copilotId,
  autoFocus,
  abortableMessageId,
  lastMessageId,
  onUserMessageCreate,
}: {
  chatId: string;
  abortableMessageId: MessageId | null;
  lastMessageId: MessageId | null;
  copilotId?: CopilotId;
  autoFocus?: boolean;
  onUserMessageCreate?: (id: MessageId) => void;
}) {
  const client = useClient();

  const handleComposerSubmit = useCallback(
    (message: { text: string }, event: FormEvent<HTMLFormElement>) => {
      if (abortableMessageId !== null) {
        event.preventDefault();
        return;
      }

      const content = [{ type: "text" as const, text: message.text }];
      const newMessageId = client[kInternal].ai[
        kInternal
      ].context.messagesStore.createOptimistically(
        chatId,
        "user",
        lastMessageId,
        content
      );
      onUserMessageCreate?.(newMessageId);
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
          stream: true,
          copilotId,
        }
      );
    },
    [
      chatId,
      client,
      copilotId,
      lastMessageId,
      onUserMessageCreate,
      abortableMessageId,
    ]
  );

  return (
    <AiComposer.Form
      className="shadow-sm ring-1 ring-neutral-950/10 dark:ring-neutral-100/10 bg-white dark:bg-neutral-800 rounded-2xl"
      dir="ltr"
      onComposerSubmit={handleComposerSubmit}
    >
      <div className="">
        <AiComposer.Editor
          autoFocus={autoFocus}
          className="outline-none [&_[data-placeholder]]:text-neutral-400 px-4 pt-4 max-h-60 overflow-y-auto"
          placeholder="Ask anything…"
        />

        <div className="flex items-center px-3 py-4 gap-2">
          <div className="ml-auto">
            {abortableMessageId === null ? (
              <AiComposer.Submit
                onPointerDown={(event) => event.preventDefault()}
                aria-label="Send"
                className="inline-flex size-7.5 rounded-full items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed bg-neutral-900 text-white hover:bg-neutral-800 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-200"
              >
                <SendIcon className="size-4" />
              </AiComposer.Submit>
            ) : (
              <button
                type="button"
                onPointerDown={(event) => event.preventDefault()}
                onClick={(event) => {
                  event.stopPropagation();
                  client[kInternal].ai.abort(abortableMessageId);
                }}
                className="inline-flex size-7.5 rounded-full items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed bg-neutral-900 text-white hover:bg-neutral-800 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-200"
                aria-label="Abort"
              >
                <StopIcon className="size-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </AiComposer.Form>
  );
}
