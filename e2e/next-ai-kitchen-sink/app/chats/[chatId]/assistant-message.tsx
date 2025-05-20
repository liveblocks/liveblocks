"use client";

import { useClient } from "@liveblocks/react/suspense";
import {
  HTMLAttributes,
  memo,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  AiAssistantContentPart,
  AiToolInvocationPart,
  CopilotId,
  Json,
  kInternal,
  MessageId,
  UiAssistantMessage,
} from "@liveblocks/core";
import { Lexer } from "marked";
import {
  type BlockToken,
  BlockTokenComp as BlockTokenCompPrimitive,
} from "./markdown";
import { useSignal } from "@liveblocks/react/_private";
import * as CollapsiblePrimitive from "./collapsible";
import { RefreshIcon } from "../../icons/refresh-icon";
import { CheckIcon } from "../../icons/check-icon";
import { ChevronDownIcon } from "../../icons/chevron-down-icon";
import { ChevronLeftIcon } from "../../icons/chevron-left-icon";
import { ChevronRightIcon } from "../../icons/chevron-right-icon";
import { CopyIcon } from "../../icons/copy-icon";
import { CircleAlertIcon } from "../../icons/circle-alert-icon";
import { TrashIcon } from "../../icons/trash-icon";

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
      return (
        <AssistantMessageContent
          content={message.contentSoFar}
          chatId={message.chatId}
          messageId={message.id}
        />
      );
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
        <AssistantMessageContent
          content={message.content}
          chatId={message.chatId}
          messageId={message.id}
        />

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
          <AssistantMessageContent
            content={message.contentSoFar}
            chatId={message.chatId}
            messageId={message.id}
          />
          {/* Message actions */}
          <MessageActions text={text} />
        </div>
      );
    } else {
      return (
        <div className="flex flex-col gap-2 group">
          {/* Message content */}
          <AssistantMessageContent
            content={message.contentSoFar}
            chatId={message.chatId}
            messageId={message.id}
          />

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

function AssistantMessageContent({
  content,
  chatId,
  messageId,
}: {
  content: AiAssistantContentPart[];
  chatId: string;
  messageId: MessageId;
}) {
  // A message is considered to be in "reasoning" state if it only contains reasoning parts and no other parts.
  const isReasoning =
    content.some((part) => part.type === "reasoning") &&
    content.every((part) => part.type === "reasoning");

  return (
    <div className="prose whitespace-break-spaces">
      {content.map((part, index) => {
        switch (part.type) {
          case "text": {
            return <TextPart key={index} text={part.text} className="prose" />;
          }
          case "tool-invocation": {
            return (
              <ToolInvocationPart
                key={index}
                chatId={chatId}
                messageId={messageId}
                part={part}
              />
            );
          }
          case "reasoning": {
            return (
              <ReasoningPart
                key={index}
                text={part.text}
                isPending={isReasoning}
              />
            );
          }
          default: {
            return null;
          }
        }
      })}
    </div>
  );
}

function TextPart({
  text,
  ...props
}: HTMLAttributes<HTMLDivElement> & { text: string }) {
  const tokens = useMemo(() => {
    return new Lexer().lex(text);
  }, [text]);

  return (
    <div {...props}>
      {tokens.map((token, index) => {
        return (
          <MemoizedBlockTokenComp token={token as BlockToken} key={index} />
        );
      })}
    </div>
  );
}

const MemoizedBlockTokenComp = memo(
  function BlockTokenComp({ token }: { token: BlockToken }) {
    return <BlockTokenCompPrimitive token={token} />;
  },
  (prevProps, nextProps) => {
    const prevToken = prevProps.token;
    const nextToken = nextProps.token;
    if (prevToken.raw.length !== nextToken.raw.length) {
      return false;
    }
    if (prevToken.type !== nextToken.type) {
      return false;
    }
    return prevToken.raw === nextToken.raw;
  }
);

function noop() {
  // Do nothing
}

function ToolInvocationPart({
  chatId,
  messageId,
  part,
}: {
  chatId: string;
  messageId: MessageId;
  part: AiToolInvocationPart;
}) {
  const client = useClient();
  const ai = client[kInternal].ai;
  const tool = useSignal(ai.signals.getToolDefinitionΣ(chatId, part.toolName));
  const respond = useCallback(
    (result: Json) => {
      ai.setToolResult(
        chatId,
        messageId,
        part.toolCallId,
        result
        // TODO Pass in AiGenerationOptions here?
      );
    },
    [ai, chatId, messageId, part.toolCallId]
  );

  if (tool === undefined || tool.render === undefined) return null;

  const { type: _, ...rest } = part;
  return (
    <div className="lb-ai-chat-message-tool">
      <tool.render
        {...rest}
        respond={
          // It only makes sense and is safe to call `respond()` in "executing" state.
          part.status === "executing" ? respond : noop
        }
      />
    </div>
  );
}

function ReasoningPart({
  text,
  isPending,
}: {
  text: string;
  isPending: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <CollapsiblePrimitive.Root
      className="lb-ai-chat-message-collapsible lb-ai-chat-message-reasoning"
      open={isOpen}
      onOpenChange={setIsOpen}
    >
      <CollapsiblePrimitive.Trigger className={`${isPending ? "" : ""}`}>
        Reasoning
        <span className="lb-icon-container">
          {isOpen ? <ChevronDownIcon /> : <ChevronRightIcon />}
        </span>
      </CollapsiblePrimitive.Trigger>

      <CollapsiblePrimitive.Content className="lb-ai-chat-message-collapsible-content">
        {text}
      </CollapsiblePrimitive.Content>
    </CollapsiblePrimitive.Root>
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
