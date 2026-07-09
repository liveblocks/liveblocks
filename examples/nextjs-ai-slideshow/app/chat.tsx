"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { nanoid } from "nanoid";
import {
  ClientSideSuspense,
  useCreateFeed,
  useCreateFeedMessage,
  useDeleteFeedMessage,
  useFeedMessages,
  useFeeds,
  useOthers,
  useRoom,
  useSelf,
  useUpdateMyPresence,
} from "@liveblocks/react/suspense";
import { Avatar } from "@liveblocks/react-ui";
import { getYjsProviderForRoom } from "@liveblocks/yjs";
import {
  CopyIcon,
  EyeIcon,
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
import { HelpButton } from "@/components/help-button";
import { resolveProposal, type SlideProposal } from "./proposal-actions";
import { getSlideIds, getSlideText } from "./slide-doc";

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
  "Create a launch slide for a realtime design tool",
  "Make this slide feel more premium",
  "Turn the slide into a metrics update",
  "Add a clear product story in three beats",
];

export function Chat({
  roomId,
  slideId,
  slideIds,
  previewedProposal,
  onPreviewProposal,
  onProposalApplied,
}: {
  roomId: string;
  slideId: string;
  slideIds: string[];
  previewedProposal: SlideProposal | null;
  onPreviewProposal: (proposal: SlideProposal | null) => void;
  onProposalApplied: (newSlideIds: string[]) => void;
}) {
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
      <div className="flex h-full w-full flex-col">
        <header className="flex items-center justify-between border-b border-neutral-950/5 px-3 py-2">
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
          </div>
          <HelpButton />
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
            slideId={slideId}
            slideIds={slideIds}
            feedId={feedId}
            model={model}
            setModel={setModel}
            previewedProposal={previewedProposal}
            onPreviewProposal={onPreviewProposal}
            onProposalApplied={onProposalApplied}
          />
        </ClientSideSuspense>
      </div>
    </TooltipProvider>
  );
}

function ChatWindow({
  roomId,
  slideId,
  slideIds,
  feedId,
  model,
  setModel,
  previewedProposal,
  onPreviewProposal,
  onProposalApplied,
}: {
  roomId: string;
  slideId: string;
  slideIds: string[];
  feedId: string;
  model: string;
  setModel: (model: string) => void;
  previewedProposal: SlideProposal | null;
  onPreviewProposal: (proposal: SlideProposal | null) => void;
  onProposalApplied: (newSlideIds: string[]) => void;
}) {
  const room = useRoom();
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

  // Automatically open new pending proposals in the Slide tab, once per
  // message. Guarded by a ref so users who dismissed the preview aren't
  // pulled back into it on unrelated re-renders.
  const autoPreviewedIds = useRef(new Set<string>());
  useEffect(() => {
    const latestProposal = [...sorted]
      .reverse()
      .find(
        (message) =>
          message.data.role === "assistant" &&
          message.data.proposals &&
          message.data.proposals.length > 0 &&
          !message.data.streaming
      );
    if (
      latestProposal?.data.proposals &&
      latestProposal.data.proposals.length > 0 &&
      latestProposal.data.proposalStatus === "pending" &&
      !autoPreviewedIds.current.has(latestProposal.id)
    ) {
      autoPreviewedIds.current.add(latestProposal.id);
      onPreviewProposal({
        feedId,
        messageId: latestProposal.id,
        proposals: latestProposal.data.proposals,
      });
    }
  }, [sorted, feedId, onPreviewProposal]);

  // Close the preview when the previewed proposal gets resolved (possibly by
  // someone else in the room) or its message is deleted.
  useEffect(() => {
    if (!previewedProposal || previewedProposal.feedId !== feedId) {
      return;
    }
    const message = sorted.find(
      (item) => item.id === previewedProposal.messageId
    );
    if (!message || message.data.proposalStatus !== "pending") {
      onPreviewProposal(null);
    }
  }, [sorted, feedId, previewedProposal, onPreviewProposal]);

  const postReply = useCallback(
    async (history: { role: "user" | "assistant"; content: string }[]) => {
      const provider = getYjsProviderForRoom(room);
      const ydoc = provider.getYDoc();
      const slides = getSlideIds(ydoc).map((id) => ({
        id,
        html: getSlideText(ydoc, id).toString(),
      }));

      await fetch("/api/ai-reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomId,
          feedId,
          model,
          messages: history,
          slides,
          currentSlideId: slideId,
        }),
      });
    },
    [room, roomId, feedId, model, slideId]
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
              <div className="flex flex-wrap justify-center gap-2">
                {STARTER_PROMPTS.map((prompt) => (
                  <Suggestion key={prompt} suggestion={prompt} onClick={send} />
                ))}
              </div>
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
                proposals,
                proposalStatus,
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

                    {isAssistant && proposals && proposals.length > 0 ? (
                      <ProposalCard
                        roomId={roomId}
                        feedId={feedId}
                        messageId={message.id}
                        proposals={proposals}
                        slideIds={slideIds}
                        status={proposalStatus}
                        generating={!!streaming}
                        previewing={
                          previewedProposal?.messageId === message.id &&
                          previewedProposal?.feedId === feedId
                        }
                        onPreview={onPreviewProposal}
                        onApplied={onProposalApplied}
                      />
                    ) : null}

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
            <PromptInputTextarea placeholder="Ask the AI to design or tweak the slide..." />
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

function ProposalCard({
  roomId,
  feedId,
  messageId,
  proposals,
  slideIds,
  status = "pending",
  generating,
  previewing,
  onPreview,
  onApplied,
}: {
  roomId: string;
  feedId: string;
  messageId: string;
  proposals: { slideId: string; html: string }[];
  slideIds: string[];
  status?: "pending" | "applied" | "rejected";
  generating: boolean;
  previewing: boolean;
  onPreview: (proposal: SlideProposal) => void;
  onApplied: (newSlideIds: string[]) => void;
}) {
  const [submitting, setSubmitting] = useState<"apply" | "reject" | null>(null);

  // While the HTML streams in, keep the code preview scrolled to the bottom
  // so the newest output stays visible.
  const preRef = useRef<HTMLPreElement>(null);
  useEffect(() => {
    if (generating && preRef.current) {
      preRef.current.scrollTop = preRef.current.scrollHeight;
    }
  }, [generating, proposals]);

  const updateProposal = useCallback(
    async (action: "apply" | "reject") => {
      if (submitting) {
        return;
      }

      setSubmitting(action);
      try {
        const { newSlideIds } = await resolveProposal(
          roomId,
          { feedId, messageId, proposals },
          action
        );
        if (action === "apply") {
          onApplied(newSlideIds);
        }
      } finally {
        setSubmitting(null);
      }
    },
    [feedId, messageId, onApplied, proposals, roomId, submitting]
  );

  return (
    <div className="mt-3 overflow-hidden rounded-md border border-neutral-950/10 bg-white shadow-xs">
      {proposals.map((proposal, index) => {
        const slideIndex = slideIds.indexOf(proposal.slideId);
        const label =
          proposal.slideId === "new"
            ? "New slide"
            : slideIndex === -1
              ? "Deleted slide"
              : `Slide ${slideIndex + 1}`;

        return (
          <section key={`${proposal.slideId}-${index}`}>
            <div
              className={`flex items-center justify-between border-neutral-950/5 px-3 py-2 ${
                index === 0 ? "border-b" : "border-y"
              }`}
            >
              <span className="text-xs font-medium text-neutral-700">
                {label}
              </span>
              {index === 0 ? (
                generating ? (
                  <Shimmer className="text-xs font-medium">Generating…</Shimmer>
                ) : status !== "pending" ? (
                  <span className="text-xs font-medium text-neutral-400">
                    {status === "applied" ? "Applied" : "Rejected"}
                  </span>
                ) : null
              ) : null}
            </div>
            <pre
              ref={index === proposals.length - 1 ? preRef : undefined}
              className="max-h-48 overflow-auto bg-neutral-50 p-3 font-mono text-[11px] leading-relaxed text-neutral-700"
            >
              <code>{proposal.html}</code>
            </pre>
          </section>
        );
      })}
      {!generating && status === "pending" ? (
        <div className="flex items-center justify-end gap-2 border-t border-neutral-950/5 p-2">
          <Button
            variant="outline"
            size="sm"
            className="mr-auto"
            onClick={() => onPreview({ feedId, messageId, proposals })}
            disabled={previewing}
          >
            <EyeIcon className="size-4" />
            {previewing ? "Previewing" : "Preview"}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => updateProposal("reject")}
            disabled={submitting !== null}
          >
            {submitting === "reject" ? "Rejecting..." : "Reject"}
          </Button>
          <Button
            size="sm"
            onClick={() => updateProposal("apply")}
            disabled={submitting !== null}
          >
            {submitting === "apply"
              ? "Applying..."
              : proposals.length === 1
                ? "Apply to slide"
                : "Apply to slides"}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
