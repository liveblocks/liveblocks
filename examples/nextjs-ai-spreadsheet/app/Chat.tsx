"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { nanoid } from "nanoid";
import { useStickToBottomContext } from "use-stick-to-bottom";
import {
  ClientSideSuspense,
  useCreateFeed,
  useCreateFeedMessage,
  useDeleteFeedMessage,
  useFeedMessages,
  useFeeds,
  useOthers,
  useSelf,
  useUpdateMyPresence,
} from "@liveblocks/react/suspense";
import { Avatar } from "@liveblocks/react-ui";
import {
  CheckIcon,
  CopyIcon,
  HistoryIcon,
  PlusIcon,
  RefreshCcwIcon,
  SparklesIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import {
  Message,
  MessageAction,
  MessageActions,
  MessageContent,
  MessageResponse,
} from "@/components/ai-elements/message";
import {
  Reasoning,
  ReasoningContent,
  ReasoningTrigger,
} from "@/components/ai-elements/reasoning";
import {
  ChainOfThought,
  ChainOfThoughtContent,
  ChainOfThoughtHeader,
  ChainOfThoughtStep,
} from "@/components/ai-elements/chain-of-thought";
import { Context, ContextTrigger } from "@/components/ai-elements/context";
import { Suggestion, Suggestions } from "@/components/ai-elements/suggestion";
import { Loader } from "@/components/ai-elements/loader";
import {
  PromptInput,
  PromptInputBody,
  PromptInputFooter,
  PromptInputSelect,
  PromptInputSelectContent,
  PromptInputSelectItem,
  PromptInputSelectTrigger,
  PromptInputSelectValue,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputTools,
  type PromptInputMessage,
} from "@/components/ai-elements/prompt-input";
import { Shimmer } from "@/components/ai-elements/shimmer";

const MODELS = [
  { id: "openai/gpt-5.4-mini", name: "GPT-5.4 mini" },
  { id: "google/gemini-3-flash", name: "Gemini 3 Flash" },
  { id: "anthropic/claude-haiku-4.5", name: "Claude Haiku 4.5" },
];

const STARTER_PROMPTS = [
  "Fill in a 5-row sample sales table",
  "Add a Q2 column with projected values",
  "Make the header row bold and blue",
  "Total the Planned and Actual columns",
];

const MAX_TOKENS = 128_000;

export function Chat({ roomId }: { roomId: string }) {
  const { feeds } = useFeeds();

  const chats = useMemo(
    () => [...feeds].sort((a, b) => b.createdAt - a.createdAt),
    [feeds]
  );

  const [feedId, setFeedId] = useState(() => chats[0]?.feedId ?? "main");
  const [model, setModel] = useState(MODELS[0].id);

  const newChat = useCallback(() => setFeedId(nanoid()), []);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="flex items-center justify-between border-b px-3 py-2">
        <div className="flex items-center gap-1.5">
          <SparklesIcon className="size-4 text-muted-foreground" />
          <span className="text-sm font-medium">AI assistant</span>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={newChat}
            aria-label="New chat"
          >
            <PlusIcon className="size-4" />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon-sm" aria-label="Chat history">
                <HistoryIcon className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
              <DropdownMenuLabel>Chat history</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {chats.length === 0 ? (
                <DropdownMenuItem disabled>No chats yet</DropdownMenuItem>
              ) : (
                chats.map((chat) => (
                  <DropdownMenuItem
                    key={chat.feedId}
                    onClick={() => setFeedId(chat.feedId)}
                    className={chat.feedId === feedId ? "bg-accent" : undefined}
                  >
                    <span className="truncate">
                      {chat.metadata?.title || "Untitled chat"}
                    </span>
                  </DropdownMenuItem>
                ))
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <ClientSideSuspense
        fallback={
          <div className="flex flex-1 items-center justify-center text-muted-foreground">
            <Loader size={20} />
          </div>
        }
      >
        <ChatWindow
          key={feedId}
          roomId={roomId}
          feedId={feedId}
          model={model}
          setModel={setModel}
        />
      </ClientSideSuspense>
    </div>
  );
}

// Exposes the StickToBottom context's `scrollToBottom` to `ChatWindow` (which
// renders `<Conversation>` and so sits outside the context itself).
function ScrollToBottomBridge({
  register,
}: {
  register: (scrollToBottom: () => void) => void;
}) {
  const { scrollToBottom } = useStickToBottomContext();
  useEffect(() => {
    register(scrollToBottom);
  }, [register, scrollToBottom]);
  return null;
}

function ChatWindow({
  roomId,
  feedId,
  model,
  setModel,
}: {
  roomId: string;
  feedId: string;
  model: string;
  setModel: (model: string) => void;
}) {
  const { messages } = useFeedMessages(feedId);
  const createFeed = useCreateFeed();
  const createFeedMessage = useCreateFeedMessage();
  const deleteFeedMessage = useDeleteFeedMessage();
  const self = useSelf();
  const updateMyPresence = useUpdateMyPresence();

  // On open, the panel mounts fresh and its content settles over a few frames.
  // Keep scrolling instant during that window so it lands at the bottom without
  // animating, then switch to smooth so streaming replies scroll nicely.
  const [scrollBehavior, setScrollBehavior] = useState<"instant" | "smooth">(
    "instant"
  );
  useEffect(() => {
    const timeout = setTimeout(() => setScrollBehavior("smooth"), 150);
    return () => clearTimeout(timeout);
  }, []);

  const selfPrompting = self.presence.promptingFeedId === feedId;
  const othersPrompting = useOthers((others) =>
    others.some((other) => other.presence.promptingFeedId === feedId)
  );
  const aiThinking = selfPrompting || othersPrompting;

  const ensuredFeeds = useRef(new Set(messages.length > 0 ? [feedId] : []));
  const ensureFeed = useCallback(
    async (id: string, title: string) => {
      if (ensuredFeeds.current.has(id)) {
        return;
      }
      ensuredFeeds.current.add(id);
      try {
        await createFeed(id, { metadata: { title } });
      } catch {
        // Feed already exists (likely created by another user), ignore.
      }
    },
    [createFeed]
  );

  const inFlight = useRef(false);
  const sorted = [...messages].sort((a, b) => a.createdAt - b.createdAt);

  // `use-stick-to-bottom` only auto-follows when the view is already pinned to
  // the bottom. When the user sends (or regenerates), force a scroll to the
  // bottom so the new message + streaming reply are visible even if they had
  // scrolled up. The `scrollToBottom` fn lives in the StickToBottom context, so
  // a small bridge component inside `<Conversation>` registers it here.
  const scrollToBottomRef = useRef<(() => void) | null>(null);
  const registerScrollToBottom = useCallback((fn: () => void) => {
    scrollToBottomRef.current = fn;
  }, []);

  const postReply = useCallback(
    async (history: { role: "user" | "assistant"; content: string }[]) => {
      await fetch("/api/ai-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomId, feedId, model, messages: history }),
      });
    },
    [roomId, feedId, model]
  );

  const send = useCallback(
    async (text: string) => {
      const content = text.trim();
      if (!content || inFlight.current) {
        return;
      }

      inFlight.current = true;
      updateMyPresence({ promptingFeedId: feedId });
      try {
        await ensureFeed(feedId, content.slice(0, 60));
        await createFeedMessage(feedId, {
          role: "user",
          content,
          userId: self.id,
          name: self.info.name,
          avatar: self.info.avatar,
        });
        // Re-pin to the bottom now that a new message is in; the streaming
        // reply then follows automatically.
        scrollToBottomRef.current?.();

        const history = [
          ...sorted.map((message) => ({
            role: message.data.role,
            content: message.data.content,
          })),
          { role: "user" as const, content },
        ];
        await postReply(history);
      } catch {
        // Best-effort in this demo; errors are non-fatal to the UI.
      } finally {
        updateMyPresence({ promptingFeedId: null });
        inFlight.current = false;
      }
    },
    [
      feedId,
      ensureFeed,
      createFeedMessage,
      self,
      sorted,
      postReply,
      updateMyPresence,
    ]
  );

  const regenerate = useCallback(
    async (messageId: string) => {
      const index = sorted.findIndex((message) => message.id === messageId);
      if (index === -1 || inFlight.current) {
        return;
      }

      inFlight.current = true;
      updateMyPresence({ promptingFeedId: feedId });
      try {
        const history = sorted.slice(0, index).map((message) => ({
          role: message.data.role,
          content: message.data.content,
        }));
        await deleteFeedMessage(feedId, messageId);
        scrollToBottomRef.current?.();
        await postReply(history);
      } catch {
        // Best-effort in this demo; errors are non-fatal to the UI.
      } finally {
        updateMyPresence({ promptingFeedId: null });
        inFlight.current = false;
      }
    },
    [feedId, sorted, deleteFeedMessage, postReply, updateMyPresence]
  );

  const usedTokens = sorted.reduce(
    (sum, message) => sum + (message.data.usedTokens ?? 0),
    0
  );

  const lastMessage = sorted.at(-1);
  const followUps =
    !aiThinking &&
    lastMessage?.data.role === "assistant" &&
    !lastMessage.data.streaming
      ? lastMessage.data.suggestions
      : undefined;

  return (
    <>
      {/* `scrollBehavior` is "instant" while the panel opens (so it jumps
          straight to the latest message) then becomes "smooth" for streaming. */}
      <Conversation initial={scrollBehavior} resize={scrollBehavior}>
        <ScrollToBottomBridge register={registerScrollToBottom} />
        <ConversationContent>
          {sorted.length === 0 ? (
            <ConversationEmptyState>
              <SparklesIcon className="size-6 text-muted-foreground" />
              <div className="space-y-1">
                <h3 className="text-sm font-medium">Edit the sheet with AI</h3>
                <p className="text-sm text-muted-foreground">
                  Ask the assistant to fill, format, or restructure the grid. It
                  writes to the shared spreadsheet live as it replies.
                </p>
              </div>
              <Suggestions className="mt-2 w-full flex-wrap justify-center">
                {STARTER_PROMPTS.map((prompt) => (
                  <Suggestion key={prompt} suggestion={prompt} onClick={send} />
                ))}
              </Suggestions>
            </ConversationEmptyState>
          ) : (
            sorted.map((message) => {
              const {
                role,
                content,
                reasoning,
                name,
                avatar,
                streaming,
                tools,
              } = message.data;
              const isAssistant = role === "assistant";

              return (
                <Message from={role} key={message.id}>
                  <MessageContent>
                    <div
                      className={`flex items-center gap-1.5 ${
                        isAssistant ? "" : "flex-row-reverse"
                      }`}
                    >
                      <Avatar
                        className="lb-root"
                        src={avatar}
                        name={name ?? (isAssistant ? "AI" : "User")}
                        style={{ width: 20, height: 20 }}
                      />
                      <span className="text-xs font-medium">
                        {name ?? (isAssistant ? "Liveblocks AI" : "Someone")}
                      </span>
                    </div>

                    {isAssistant && reasoning ? (
                      <Reasoning isStreaming={!!streaming} defaultOpen={false}>
                        <ReasoningTrigger />
                        <ReasoningContent>{reasoning}</ReasoningContent>
                      </Reasoning>
                    ) : null}

                    {isAssistant && tools && tools.length > 0 ? (
                      <ChainOfThought>
                        <ChainOfThoughtHeader>
                          {tools.length === 1
                            ? "1 action taken"
                            : `${tools.length} actions taken`}
                        </ChainOfThoughtHeader>
                        <ChainOfThoughtContent>
                          {tools.map((tool, index) => (
                            <ChainOfThoughtStep
                              key={index}
                              label={tool.output || tool.name}
                            />
                          ))}
                        </ChainOfThoughtContent>
                      </ChainOfThought>
                    ) : null}

                    <div className="min-h-lh">
                      {content ? (
                        <MessageResponse>{content}</MessageResponse>
                      ) : null}

                      {isAssistant && streaming && !content && !reasoning ? (
                        <Shimmer>Working…</Shimmer>
                      ) : null}
                    </div>

                    {isAssistant ? (
                      <MessageActions>
                        <CopyMessageAction text={content} />
                        <MessageAction
                          tooltip="Regenerate"
                          onClick={() => regenerate(message.id)}
                          disabled={streaming}
                        >
                          <RefreshCcwIcon className="size-4" />
                        </MessageAction>
                      </MessageActions>
                    ) : null}
                  </MessageContent>
                </Message>
              );
            })
          )}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>

      <div className="flex flex-col gap-2 p-2">
        {followUps && followUps.length > 0 ? (
          <Suggestions className="w-full flex-wrap">
            {followUps.map((prompt) => (
              <Suggestion key={prompt} suggestion={prompt} onClick={send} />
            ))}
          </Suggestions>
        ) : null}

        <PromptInput
          onSubmit={(message: PromptInputMessage) => send(message.text)}
        >
          <PromptInputBody>
            <PromptInputTextarea placeholder="Ask AI to edit the sheet…" />
          </PromptInputBody>
          <PromptInputFooter>
            <PromptInputTools>
              <PromptInputSelect value={model} onValueChange={setModel}>
                <PromptInputSelectTrigger className="h-8! px-1.5!">
                  <PromptInputSelectValue />
                </PromptInputSelectTrigger>
                <PromptInputSelectContent>
                  {MODELS.map((m) => (
                    <PromptInputSelectItem key={m.id} value={m.id}>
                      {m.name}
                    </PromptInputSelectItem>
                  ))}
                </PromptInputSelectContent>
              </PromptInputSelect>
            </PromptInputTools>
            <div className="flex items-center gap-1">
              {usedTokens > 0 ? (
                <Context usedTokens={usedTokens} maxTokens={MAX_TOKENS}>
                  <ContextTrigger className="h-8 px-1.5!" />
                </Context>
              ) : null}
              <PromptInputSubmit
                disabled={aiThinking}
                status={aiThinking ? "submitted" : undefined}
              />
            </div>
          </PromptInputFooter>
        </PromptInput>
      </div>
    </>
  );
}

// Copy the message's text to the clipboard, briefly showing a check icon.
function CopyMessageAction({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const copy = useCallback(() => {
    if (!text) {
      return;
    }
    void navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }, [text]);

  return (
    <MessageAction
      tooltip={copied ? "Copied" : "Copy"}
      onClick={copy}
      disabled={!text}
    >
      {copied ? (
        <CheckIcon className="size-4" />
      ) : (
        <CopyIcon className="size-4" />
      )}
    </MessageAction>
  );
}
