"use client";

import { useCallback, useRef, useState } from "react";
import {
  useCreateFeed,
  useCreateFeedMessage,
  useDeleteFeedMessage,
  useFeedMessages,
  useFeeds,
  useOthers,
} from "@liveblocks/react/suspense";
import {
  CopyIcon,
  RefreshCcwIcon,
  SparklesIcon,
} from "lucide-react";
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
  MessageToolbar,
} from "@/components/ai-elements/message";
import {
  Reasoning,
  ReasoningContent,
  ReasoningTrigger,
} from "@/components/ai-elements/reasoning";
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

// A single shared feed per room. Everyone connected reads and writes to it, so
// messages (and the AI's replies) appear live for all users.
const FEED_ID = "ai-chat";

// Model ids resolved through the Vercel AI Gateway in the server route.
const MODELS = [
  { id: "openai/gpt-4o-mini", name: "GPT-4o mini" },
  { id: "openai/gpt-4o", name: "GPT-4o" },
  { id: "anthropic/claude-sonnet-4", name: "Claude Sonnet 4" },
];

const STARTER_PROMPTS = [
  "Explain how Liveblocks Feeds work",
  "Write a haiku about realtime collaboration",
  "Ideas for an AI agent dashboard",
  "Summarize the benefits of multiplayer apps",
];

export function Chat({ roomId }: { roomId: string }) {
  const { messages } = useFeedMessages(FEED_ID);
  const { feeds } = useFeeds();
  const createFeed = useCreateFeed();
  const createFeedMessage = useCreateFeedMessage();
  const deleteFeedMessage = useDeleteFeedMessage();
  const others = useOthers();

  const [model, setModel] = useState(MODELS[0].id);
  const [pending, setPending] = useState(false);

  // Ensure the feed exists before the first message is added.
  const feedReady = useRef(feeds.some((feed) => feed.feedId === FEED_ID));
  const ensureFeed = useCallback(async () => {
    if (feedReady.current) {
      return;
    }
    try {
      await createFeed(FEED_ID, { metadata: { title: "AI chat" } });
    } catch {
      // Feed already exists (likely created by another user), ignore.
    }
    feedReady.current = true;
  }, [createFeed]);

  // Synchronous guard against double-sends (e.g. fast clicks on a suggestion),
  // since `pending` state updates asynchronously.
  const inFlight = useRef(false);

  const sorted = [...messages].sort((a, b) => a.createdAt - b.createdAt);

  const postReply = useCallback(
    async (history: { role: "user" | "assistant"; content: string }[]) => {
      await fetch("/api/ai-reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomId, feedId: FEED_ID, model, messages: history }),
      });
    },
    [roomId, model]
  );

  const send = useCallback(
    async (text: string) => {
      const content = text.trim();
      if (!content || inFlight.current) {
        return;
      }

      inFlight.current = true;
      setPending(true);
      try {
        await ensureFeed();
        await createFeedMessage(FEED_ID, { role: "user", content });

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
        setPending(false);
        inFlight.current = false;
      }
    },
    [ensureFeed, createFeedMessage, sorted, postReply]
  );

  const regenerate = useCallback(
    async (messageId: string) => {
      const index = sorted.findIndex((message) => message.id === messageId);
      if (index === -1 || inFlight.current) {
        return;
      }

      inFlight.current = true;
      setPending(true);
      try {
        const history = sorted.slice(0, index).map((message) => ({
          role: message.data.role,
          content: message.data.content,
        }));
        await deleteFeedMessage(FEED_ID, messageId);
        await postReply(history);
      } catch {
        // Best-effort in this demo; errors are non-fatal to the UI.
      } finally {
        setPending(false);
        inFlight.current = false;
      }
    },
    [sorted, deleteFeedMessage, postReply]
  );

  const lastMessage = sorted.at(-1);
  const followUps =
    !pending && lastMessage?.data.role === "assistant"
      ? lastMessage.data.suggestions
      : undefined;

  return (
    <TooltipProvider>
      <div className="mx-auto flex h-dvh w-full max-w-3xl flex-col">
        <header className="flex items-center justify-between border-b px-5 py-3">
          <div className="flex items-center gap-2">
            <SparklesIcon className="size-4" />
            <h1 className="font-semibold text-sm">AI Feeds</h1>
          </div>
          <p className="text-muted-foreground text-xs">
            {others.length === 0
              ? "Only you are here"
              : `${others.length + 1} people here`}
            {" · "}realtime via Liveblocks Feeds
          </p>
        </header>

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
                <Suggestions className="mt-2 justify-center">
                  {STARTER_PROMPTS.map((prompt) => (
                    <Suggestion
                      key={prompt}
                      suggestion={prompt}
                      onClick={send}
                    />
                  ))}
                </Suggestions>
              </ConversationEmptyState>
            ) : (
              sorted.map((message) => {
                const { role, content, reasoning, sources, model: usedModel } =
                  message.data;
                const isAssistant = role === "assistant";

                return (
                  <Message from={role} key={message.id}>
                    <MessageContent>
                      {isAssistant && reasoning ? (
                        <Reasoning defaultOpen={false}>
                          <ReasoningTrigger />
                          <ReasoningContent>{reasoning}</ReasoningContent>
                        </Reasoning>
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

                      <MessageResponse>{content}</MessageResponse>

                      {isAssistant ? (
                        <MessageToolbar>
                          <MessageActions>
                            <MessageAction
                              tooltip="Copy"
                              onClick={() => {
                                void navigator.clipboard
                                  ?.writeText(content)
                                  ?.catch(() => {});
                              }}
                            >
                              <CopyIcon className="size-4" />
                            </MessageAction>
                            <MessageAction
                              tooltip="Regenerate"
                              onClick={() => regenerate(message.id)}
                            >
                              <RefreshCcwIcon className="size-4" />
                            </MessageAction>
                          </MessageActions>
                          {usedModel ? (
                            <span className="text-muted-foreground text-xs">
                              {MODELS.find((m) => m.id === usedModel)?.name ??
                                usedModel}
                            </span>
                          ) : null}
                        </MessageToolbar>
                      ) : null}
                    </MessageContent>
                  </Message>
                );
              })
            )}

            {pending ? (
              <Message from="assistant">
                <MessageContent>
                  <span className="flex items-center gap-2 text-muted-foreground text-sm">
                    <Loader size={14} />
                    Thinking…
                  </span>
                </MessageContent>
              </Message>
            ) : null}
          </ConversationContent>
          <ConversationScrollButton />
        </Conversation>

        <div className="flex flex-col gap-3 p-4">
          {followUps && followUps.length > 0 ? (
            <Suggestions>
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
              <PromptInputSubmit
                disabled={pending}
                status={pending ? "submitted" : undefined}
              />
            </PromptInputFooter>
          </PromptInput>
        </div>
      </div>
    </TooltipProvider>
  );
}
