import { memo, useState, useEffect, useCallback } from "react";
import { CheckIcon } from "../../icons/check-icon";
import { CopyIcon } from "../../icons/copy-icon";
import { PencilIcon } from "../../icons/pencil-icon";
import {
  AiUserMessage,
  CopilotId,
  kInternal,
  MessageId,
  WithNavigation,
} from "@liveblocks/core";
import { AiComposer } from "@liveblocks/react-ui/_private";
import { useClient } from "@liveblocks/react";
import { ChevronLeftIcon } from "../../icons/chevron-left-icon";
import { ChevronRightIcon } from "../../icons/chevron-right-icon";
import { TrashIcon } from "../../icons/trash-icon";

type UiUserMessage = WithNavigation<AiUserMessage>;

export const UserMessage = memo(function UserMessage({
  message,
  onBranchChange,
  copilotId,
}: {
  message: UiUserMessage;
  copilotId?: CopilotId;
  onBranchChange: (branch: MessageId | null) => void;
}) {
  const content = message.content
    .filter((c) => c.type === "text")
    .map((c) => c.text);

  const [isCopied, setIsCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const client = useClient();

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setIsCopied(false);
    }, 2000);
    return () => {
      clearTimeout(timeoutId);
    };
  }, [isCopied]);

  const handleComposerSubmit = useCallback(
    ({ text }: { text: string }) => {
      const content = [{ type: "text" as const, text: text }];

      const newMessageId = client[kInternal].ai[
        kInternal
      ].context.messagesStore.createOptimistically(
        message.chatId,
        "user",
        message.navigation.parent,
        content
      );

      const targetMessageId = client[kInternal].ai[
        kInternal
      ].context.messagesStore.createOptimistically(
        message.chatId,
        "assistant",
        newMessageId
      );

      onBranchChange(newMessageId);
      setIsEditing(false);

      client[kInternal].ai.askUserMessageInChat(
        message.chatId,
        {
          id: newMessageId,
          parentMessageId: message.navigation.parent,
          content,
        },
        targetMessageId,
        {
          stream: true,
          copilotId,
        }
      );
    },
    [
      client,
      copilotId,
      message.chatId,
      message.navigation.parent,
      onBranchChange,
    ]
  );

  if (isEditing) {
    return (
      <div className="flex flex-col w-full">
        <AiComposer.Form
          className="shadow ring-1 ring-neutral-950/10 dark:ring-neutral-100/10 bg-white dark:bg-neutral-800 rounded-2xl"
          dir="ltr"
          onComposerSubmit={handleComposerSubmit}
        >
          <div className="">
            <AiComposer.Editor
              autoFocus={true}
              className="outline-none [&_[data-placeholder]]:text-neutral-400 px-4 pt-4 max-h-60 overflow-y-auto"
              placeholder="Ask anything…"
              defaultValue={content.join("\n")}
            />

            <div className="flex items-center px-3 py-4 gap-2">
              <div className="ml-auto flex flex-row gap-2">
                <button
                  type="button"
                  onPointerDown={(event) => event.preventDefault()}
                  aria-label="Send"
                  className="inline-flex rounded-lg items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed text-sm py-2 px-3 font-medium bg-neutral-100 text-neutral-950 hover:bg-neutral-200 dark:bg-neutral-900 dark:text-white dark:hover:bg-neutral-900/80"
                  onClick={() => {
                    setIsEditing(false);
                  }}
                >
                  Cancel
                </button>

                <AiComposer.Submit
                  onPointerDown={(event) => event.preventDefault()}
                  aria-label="Send"
                  className="inline-flex rounded-lg items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed text-sm py-2 px-3 font-medium bg-neutral-900 text-white hover:bg-neutral-800 dark:bg-neutral-100 dark:text-neutral-950 dark:hover:bg-neutral-200"
                >
                  Send
                </AiComposer.Submit>
              </div>
            </div>
          </div>
        </AiComposer.Form>
      </div>
    );
  }

  return (
    <div className="flex flex-col max-w-[80%] ml-auto gap-0.5 group">
      {message.deletedAt !== undefined ? (
        <div className="w-full flex flex-col gap-2">
          <div className="text-neutral-500 dark:text-neutral-50">
            This message has been deleted.
          </div>

          <div className="flex flex-row group-hover:opacity-100 opacity-0 transition-opacity duration-200 ease-in-out w-full justify-end">
            <button
              onClick={function () {
                if (message.navigation.prev === null) return;
                onBranchChange(message.navigation.prev);
              }}
              disabled={message.navigation.prev === null}
              className="inline-flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed hover:bg-neutral-100 hover:dark:bg-neutral-800 rounded-lg size-7.5"
            >
              <ChevronLeftIcon className="size-4" />
            </button>

            <button
              onClick={function () {
                if (message.navigation.next === null) return;
                onBranchChange(message.navigation.next);
              }}
              disabled={message.navigation.next === null}
              className="inline-flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed hover:bg-neutral-100 hover:dark:bg-neutral-800 rounded-lg size-7.5"
            >
              <ChevronRightIcon className="size-4" />
            </button>
          </div>
        </div>
      ) : (
        <div className="w-full flex flex-col gap-2">
          <div className="px-5 py-2.5 rounded-3xl bg-neutral-100 dark:bg-neutral-800 whitespace-break-spaces ml-auto">
            {content.map((text, index) => (
              <p key={index}>{text}</p>
            ))}
          </div>

          <div className="flex flex-row group-hover:opacity-100 opacity-0 transition-opacity duration-200 ease-in-out w-full justify-end">
            <button
              onClick={function () {
                if (message.navigation.prev === null) return;
                onBranchChange(message.navigation.prev);
              }}
              disabled={message.navigation.prev === null}
              className="inline-flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed hover:bg-neutral-100 hover:dark:bg-neutral-800 rounded-lg size-7.5"
            >
              <ChevronLeftIcon className="size-4" />
            </button>

            <button
              onClick={function () {
                if (message.navigation.next === null) return;
                onBranchChange(message.navigation.next);
              }}
              disabled={message.navigation.next === null}
              className="inline-flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed hover:bg-neutral-100 hover:dark:bg-neutral-800 rounded-lg size-7.5"
            >
              <ChevronRightIcon className="size-4" />
            </button>

            <button
              onClick={function () {
                navigator.clipboard.writeText(content.join("\n"));
                setIsCopied(true);
              }}
              className="inline-flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed hover:bg-neutral-100 hover:dark:bg-neutral-800 rounded-lg size-7.5"
              aria-label="Copy"
            >
              {isCopied ? (
                <CheckIcon className="size-4" />
              ) : (
                <CopyIcon className="size-4" />
              )}
            </button>

            <button
              onClick={() => {
                setIsEditing(true);
              }}
              className="inline-flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed hover:bg-neutral-100 hover:dark:bg-neutral-800 rounded-lg size-7.5"
              aria-label="Edit"
            >
              <PencilIcon className="size-4" />
            </button>

            <button
              onClick={function () {
                client[kInternal].ai.deleteMessage(message.chatId, message.id);
              }}
              className="inline-flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed hover:bg-neutral-100 hover:dark:bg-neutral-800 rounded-lg size-7.5"
              aria-label="Delete message"
            >
              <TrashIcon className="size-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
});
