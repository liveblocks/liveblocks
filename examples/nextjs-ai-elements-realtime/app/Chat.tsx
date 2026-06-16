"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { nanoid } from "nanoid";
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
import { Avatar, AvatarStack } from "@liveblocks/react-ui";
import {
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
  ChainOfThoughtSearchResult,
  ChainOfThoughtSearchResults,
  ChainOfThoughtStep,
} from "@/components/ai-elements/chain-of-thought";
import {
  Tool,
  ToolContent,
  ToolHeader,
  ToolInput,
  ToolOutput,
} from "@/components/ai-elements/tool";
import { Context, ContextTrigger } from "@/components/ai-elements/context";
import {
  Source,
  Sources,
  SourcesContent,
  SourcesTrigger,
} from "@/components/ai-elements/sources";
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
import { TooltipProvider } from "@/components/ui/tooltip";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { HelpButton } from "@/components/HelpButton";
import { AI_USER_AVATAR, AI_USER_NAME } from "./database";

// Each chat is a feed in the room. Everyone connected reads and writes to the
// selected feed, so messages (and the AI's replies) appear live for all users.

// Cheap, reasoning-capable models, resolved through the Vercel AI Gateway in
// the server route.
const MODELS = [
  { id: "google/gemini-3-flash", name: "Gemini 3 Flash" },
  { id: "openai/gpt-5.4-mini", name: "GPT-5.4 mini" },
  { id: "anthropic/claude-haiku-4.5", name: "Claude Haiku 4.5" },
  { id: "deepseek/deepseek-r1", name: "DeepSeek R1" },
];

const STARTER_PROMPTS = [
  "Explain how Liveblocks Feeds work",
  "Write a haiku about realtime collaboration",
  "Ideas for an AI agent dashboard",
  "Summarize the benefits of multiplayer apps",
];

export function Chat({ roomId }: { roomId: string }) {
  const { feeds } = useFeeds();

  // Chat history: every feed in the room, newest first.
  const chats = useMemo(
    () => [...feeds].sort((a, b) => b.createdAt - a.createdAt),
    [feeds]
  );

  // The currently selected chat (feed). Defaults to the most recent one, or a
  // stable default id for the first chat. (A render-time `nanoid()` here would
  // change on every Suspense retry and never settle.)
  const [feedId, setFeedId] = useState(() => chats[0]?.feedId ?? "main");
  const [model, setModel] = useState(MODELS[0].id);

  const newChat = useCallback(() => setFeedId(nanoid()), []);

  return (
    <TooltipProvider>
      <div className="mx-auto flex h-dvh w-full max-w-3xl flex-col border-x">
        <header className="flex items-center justify-between border-b px-5 py-3">
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
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Chat history"
                >
                  <HistoryIcon className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-64">
                <DropdownMenuLabel>Chat history</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {chats.length === 0 ? (
                  <DropdownMenuItem disabled>No chats yet</DropdownMenuItem>
                ) : (
                  chats.map((chat) => (
                    <DropdownMenuItem
                      key={chat.feedId}
                      onClick={() => setFeedId(chat.feedId)}
                      className={
                        chat.feedId === feedId ? "bg-accent" : undefined
                      }
                    >
                      <span className="truncate">
                        {chat.metadata?.title || "Untitled chat"}
                      </span>
                    </DropdownMenuItem>
                  ))
                )}
              </DropdownMenuContent>
            </DropdownMenu>
            <HelpButton />
          </div>

          {/* Live presence: everyone currently in the room */}
          <AvatarStack size={28} />
        </header>

        {/* The chat is suspense-wrapped on its own so switching chats only
            shows a loader in the conversation area, not the whole screen. */}
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
    </TooltipProvider>
  );
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

  // The AI "thinking" status is shared via presence (scoped to this chat), so
  // everyone viewing this chat sees it — not just whoever triggered the reply.
  const selfPrompting = self.presence.promptingFeedId === feedId;
  const othersPrompting = useOthers((others) =>
    others.some((other) => other.presence.promptingFeedId === feedId)
  );
  const aiThinking = selfPrompting || othersPrompting;

  // Ensure a feed exists before its first message is added.
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

  // Synchronous guard against double-sends (e.g. fast clicks on a suggestion).
  const inFlight = useRef(false);

  const sorted = [...messages].sort((a, b) => a.createdAt - b.createdAt);

  const postReply = useCallback(
    async (history: { role: "user" | "assistant"; content: string }[]) => {
      await fetch("/api/ai-reply", {
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

  // Total context-window usage across the conversation, shown in the composer.
  const usedTokens = sorted.reduce(
    (sum, message) => sum + (message.data.usedTokens ?? 0),
    0
  );

  const lastMessage = sorted.at(-1);
  const streamingInProgress =
    lastMessage?.data.role === "assistant" && !!lastMessage.data.streaming;
  const followUps =
    !aiThinking &&
    lastMessage?.data.role === "assistant" &&
    !lastMessage.data.streaming
      ? lastMessage.data.suggestions
      : undefined;

  return (
    <>
      <Conversation>
        <ConversationContent>
          {sorted.length === 0 ? (
            <ConversationEmptyState>
              <SparklesIcon className="size-6 text-muted-foreground" />
              <div className="space-y-1">
                <h3 className="font-medium text-sm">Start the conversation</h3>
                <p className="text-muted-foreground text-sm">
                  Messages sync live to everyone in this room. Replies are
                  generated by the AI and written into the shared feed.
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
                sources,
                name,
                avatar,
                streaming,
                chainOfThought,
                tool,
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
                        // `lb-root` provides the CSS variables the avatar
                        // needs (radius, colors) when used standalone.
                        className="lb-root"
                        src={avatar}
                        name={name ?? (isAssistant ? "AI" : "User")}
                        style={{ width: 20, height: 20 }}
                      />
                      <span className="font-medium text-xs">
                        {name ?? (isAssistant ? "Liveblocks AI" : "Someone")}
                      </span>
                    </div>

                    {isAssistant &&
                    chainOfThought &&
                    chainOfThought.length > 0 ? (
                      <ChainOfThought defaultOpen={false}>
                        <ChainOfThoughtHeader>
                          Chain of thought
                        </ChainOfThoughtHeader>
                        <ChainOfThoughtContent>
                          {chainOfThought.map((step, index) => (
                            <ChainOfThoughtStep
                              key={index}
                              label={step.label}
                              description={step.description}
                              status={step.status ?? "complete"}
                            >
                              {step.search && step.search.length > 0 ? (
                                <ChainOfThoughtSearchResults>
                                  {step.search.map((term) => (
                                    <ChainOfThoughtSearchResult key={term}>
                                      {term}
                                    </ChainOfThoughtSearchResult>
                                  ))}
                                </ChainOfThoughtSearchResults>
                              ) : null}
                            </ChainOfThoughtStep>
                          ))}
                        </ChainOfThoughtContent>
                      </ChainOfThought>
                    ) : null}

                    {isAssistant && reasoning ? (
                      <Reasoning
                        isStreaming={!!streaming}
                        defaultOpen={!!streaming}
                      >
                        <ReasoningTrigger />
                        <ReasoningContent>{reasoning}</ReasoningContent>
                      </Reasoning>
                    ) : null}

                    {isAssistant && tool ? (
                      <Tool>
                        <ToolHeader
                          type={`tool-${tool.name}`}
                          state="output-available"
                          title={tool.name}
                        />
                        <ToolContent>
                          <ToolInput input={tool.input} />
                          <ToolOutput
                            output={tool.output}
                            errorText={undefined}
                          />
                        </ToolContent>
                      </Tool>
                    ) : null}

                    {isAssistant && sources && sources.length > 0 ? (
                      <Sources>
                        <SourcesTrigger count={sources.length} />
                        <SourcesContent>
                          {sources.map((source) => (
                            <Source
                              key={source.url}
                              href={source.url}
                              title={source.title}
                            />
                          ))}
                        </SourcesContent>
                      </Sources>
                    ) : null}

                    <div className="min-h-lh">
                      {content ? (
                        <MessageResponse>{content}</MessageResponse>
                      ) : null}

                      {isAssistant && streaming && !content && !reasoning ? (
                        <Shimmer>Thinking…</Shimmer>
                      ) : null}
                    </div>

                    {isAssistant ? (
                      <MessageActions>
                        <MessageAction
                          tooltip="Copy"
                          onClick={() => {
                            void navigator.clipboard
                              ?.writeText(content)
                              ?.catch(() => {});
                          }}
                          disabled={!content}
                        >
                          <CopyIcon className="size-4" />
                        </MessageAction>
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

      <div className="flex flex-col gap-3 p-4">
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
            <PromptInputTextarea placeholder="Message everyone in this room…" />
          </PromptInputBody>
          <PromptInputFooter>
            <PromptInputTools>
              <PromptInputSelect value={model} onValueChange={setModel}>
                <PromptInputSelectTrigger>
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
                <Context usedTokens={usedTokens} maxTokens={128000}>
                  <ContextTrigger />
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
