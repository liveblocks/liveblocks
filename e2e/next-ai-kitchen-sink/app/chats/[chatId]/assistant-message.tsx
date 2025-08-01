"use client";

import { useClient } from "@liveblocks/react/suspense";
import { HTMLAttributes, memo, useEffect, useState } from "react";
import {
  AiAssistantMessage,
  CopilotId,
  kInternal,
  MessageId,
  WithNavigation,
} from "@liveblocks/core";
import { RefreshIcon } from "../../icons/refresh-icon";
import { CheckIcon } from "../../icons/check-icon";
import { ChevronDownIcon } from "../../icons/chevron-down-icon";
import { ChevronLeftIcon } from "../../icons/chevron-left-icon";
import { ChevronRightIcon } from "../../icons/chevron-right-icon";
import { CopyIcon } from "../../icons/copy-icon";
import { CircleAlertIcon } from "../../icons/circle-alert-icon";
import { TrashIcon } from "../../icons/trash-icon";
import {
  AiMessage,
  Markdown,
  Collapsible,
} from "@liveblocks/react-ui/_private";

type UiAssistantMessage = WithNavigation<AiAssistantMessage>;

export const AssistantMessage = memo(function AssistantMessage({
  message,
  copilotId,
  onBranchChange,
}: {
  message: UiAssistantMessage;
  onBranchChange: (branch: MessageId | null) => void;
  copilotId: CopilotId | undefined;
}) {
  const client = useClient();
  function MessageActions({ text }: { text: string }) {
    return (
      <div className="flex flex-row group-hover:opacity-100 opacity-0 transition-opacity duration-200 ease-in-out">
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

        <CopyTextButton text={text} label="Copy message" />

        <button
          disabled={message.navigation.parent === null}
          onClick={function () {
            if (message.navigation.parent === null) return;
            const targetMessageId = client[kInternal].ai[
              kInternal
            ].context.messagesStore.createOptimistically(
              message.chatId,
              "assistant",
              message.navigation.parent
            );

            onBranchChange(null);

            client[kInternal].ai.askUserMessageInChat(
              message.chatId,
              message.navigation.parent,
              targetMessageId,
              {
                stream: true,
                copilotId,
              }
            );
          }}
          className="inline-flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed hover:bg-neutral-100 hover:dark:bg-neutral-800 rounded-lg size-7.5"
          aria-label="Try again"
        >
          <RefreshIcon className="size-4" />
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
    );
  }

  if (message.deletedAt !== undefined) {
    return (
      <div className="flex flex-col">
        <div className="">This message has been deleted.</div>
      </div>
    );
  } else if (
    message.status === "generating" ||
    message.status === "awaiting-tool"
  ) {
    if (message.contentSoFar.length === 0) {
      return (
        <div className="">
          <div className="bg-neutral-900 dark:bg-neutral-50 animate-[pulse-dot_1.2s_ease-in-out_infinite] rounded-full size-2">
            <span className="sr-only">Thinking</span>
          </div>
        </div>
      );
    } else {
      return <AssistantMessageContent message={message} />;
    }
  } else if (message.status === "completed") {
    const text: string = message.content.reduce((acc, part) => {
      if (part.type === "text") {
        return acc + part.text;
      }
      return acc;
    }, "");

    return (
      <div className="flex flex-col gap-2 group">
        {/* Message content */}
        <AssistantMessageContent message={message} />

        {/* Message actions */}
        <MessageActions text={text} />
      </div>
    );
  } else if (message.status === "failed") {
    const text: string = message.contentSoFar.reduce((acc, part) => {
      if (part.type === "text") {
        return acc + part.text;
      }
      return acc;
    }, "");

    if (message.errorReason === "Aborted by user") {
      return (
        <div className="flex flex-col gap-2 group">
          {/* Message content */}
          <AssistantMessageContent message={message} />
          {/* Message actions */}
          <MessageActions text={text} />
        </div>
      );
    } else {
      return (
        <div className="flex flex-col gap-2 group">
          {/* Message content */}
          <AssistantMessageContent message={message} />

          <div className="flex flex-row gap-4 items-center rounded-lg bg-red-100/50 p-4 text-sm mt-2 text-red-400 dark:bg-red-900/40 dark:text-red-300">
            <CircleAlertIcon className="size-4" />
            <p>{message.errorReason}</p>
          </div>

          {/* Message actions */}
          <MessageActions text={text} />
        </div>
      );
    }
  }
});

function AssistantMessageContent({ message }: { message: UiAssistantMessage }) {
  const content = message.content ?? message.contentSoFar;

  // A message is considered to be in "reasoning" state if it only contains reasoning parts and no other parts.
  const isReasoning =
    content.some((part) => part.type === "reasoning") &&
    content.every((part) => part.type === "reasoning");

  return (
    <div>
      <AiMessage.Content
        message={message}
        parts={{
          Text: ({ part }) => (
            <TextPart
              text={part.text}
              className="prose whitespace-break-spaces"
            />
          ),
          Reasoning: ({ part }) => (
            <ReasoningPart text={part.text} isPending={isReasoning} />
          ),
        }}
      />
    </div>
  );
}

function TextPart({
  text,
  ...props
}: HTMLAttributes<HTMLDivElement> & { text: string }) {
  return <Markdown content={text} {...props} />;
}

function ReasoningPart({ text }: { text: string; isPending: boolean }) {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <Collapsible.Root
      className="flex flex-col"
      open={isOpen}
      onOpenChange={setIsOpen}
    >
      <Collapsible.Trigger className="flex items-center gap-1">
        Reasoning
        {isOpen ? <ChevronDownIcon /> : <ChevronRightIcon />}
      </Collapsible.Trigger>

      <Collapsible.Content className="pt-2">{text}</Collapsible.Content>
    </Collapsible.Root>
  );
}

function CopyTextButton({ text, label }: { text: string; label: string }) {
  const [isCopied, setIsCopied] = useState(false);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setIsCopied(false);
    }, 2000);
    return () => {
      clearTimeout(timeoutId);
    };
  }, [isCopied]);

  return (
    <button
      onClick={function () {
        navigator.clipboard.writeText(text);
        setIsCopied(true);
      }}
      className="inline-flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed hover:bg-neutral-100 hover:dark:bg-neutral-800 rounded-lg size-7.5"
      aria-label={label}
    >
      {isCopied ? (
        <CheckIcon className="size-4" />
      ) : (
        <CopyIcon className="size-4" />
      )}
    </button>
  );
}
