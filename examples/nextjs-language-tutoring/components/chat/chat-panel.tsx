"use client";

// Non-suspense variant so the loading state renders inside the panel
import { useFeedMessages } from "@liveblocks/react";
import { useSelf, useUser } from "@liveblocks/react/suspense";
import { Loader2Icon, SendHorizonalIcon } from "lucide-react";
import {
  type FormEvent,
  type KeyboardEvent,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { UserAvatar } from "@/components/user-avatar";
import { SnapshotCard } from "./snapshot-card";
import { CHAT_FEED_ID, useChat } from "./use-chat";

type Message = {
  id: string;
  createdAt: number;
  data: Liveblocks["FeedMessageData"];
};

export function ChatPanel({
  onOpenDocument,
}: {
  onOpenDocument: (docId: string) => void;
}) {
  const result = useFeedMessages(CHAT_FEED_ID);
  const messages = result.messages ?? [];
  const { isLoading, hasFetchedAll, fetchMore, isFetchingMore } = result;
  const { sendText } = useChat();
  const listRef = useRef<HTMLDivElement>(null);
  const stickToBottom = useRef(true);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);

  // Messages arrive oldest-first; keep the view pinned to the newest one
  // unless the user has scrolled up to read history.
  useLayoutEffect(() => {
    const list = listRef.current;
    if (list && stickToBottom.current) {
      list.scrollTop = list.scrollHeight;
    }
  }, [messages.length]);

  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    function onScroll() {
      if (!list) return;
      stickToBottom.current =
        list.scrollHeight - list.scrollTop - list.clientHeight < 40;
    }
    list.addEventListener("scroll", onScroll, { passive: true });
    return () => list.removeEventListener("scroll", onScroll);
  }, []);

  async function submit(event?: FormEvent) {
    event?.preventDefault();
    if (!draft.trim() || sending) return;
    setSending(true);
    try {
      await sendText(draft);
      setDraft("");
      stickToBottom.current = true;
    } finally {
      setSending(false);
    }
  }

  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void submit();
    }
  }

  const sorted = [...(messages as Message[])].sort(
    (a, b) => a.createdAt - b.createdAt
  );

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-12 shrink-0 items-center border-b border-neutral-200 px-4">
        <h2 className="text-sm font-semibold">Chat</h2>
      </div>

      <div ref={listRef} className="flex-1 overflow-y-auto px-4 py-3">
        {!hasFetchedAll && !isLoading ? (
          <div className="mb-3 flex justify-center">
            <Button
              variant="ghost"
              size="xs"
              disabled={isFetchingMore}
              onClick={() => void fetchMore?.()}
            >
              {isFetchingMore ? <Loader2Icon className="animate-spin" /> : null}
              Load earlier messages
            </Button>
          </div>
        ) : null}

        {isLoading ? (
          <div className="flex h-full items-center justify-center">
            <Loader2Icon className="size-4 animate-spin text-neutral-400" />
          </div>
        ) : sorted.length === 0 ? (
          <p className="mt-6 text-center text-sm text-neutral-500">
            No messages yet. Say hi, or send a document page here with the{" "}
            <span className="font-medium">Send to chat</span> button.
          </p>
        ) : (
          <ol className="flex flex-col gap-3">
            {sorted.map((message, index) => (
              <ChatMessage
                key={message.id}
                message={message}
                previous={sorted[index - 1]}
                onOpenDocument={onOpenDocument}
              />
            ))}
          </ol>
        )}
      </div>

      <form
        onSubmit={(event) => void submit(event)}
        className="flex items-end gap-2 border-t border-neutral-200 p-3"
      >
        <Textarea
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Write a message…"
          rows={1}
          className="max-h-32 min-h-9 flex-1 resize-none"
          aria-label="Message"
        />
        <Button
          type="submit"
          size="icon"
          disabled={!draft.trim() || sending}
          aria-label="Send"
        >
          {sending ? (
            <Loader2Icon className="animate-spin" />
          ) : (
            <SendHorizonalIcon />
          )}
        </Button>
      </form>
    </div>
  );
}

function ChatMessage({
  message,
  previous,
  onOpenDocument,
}: {
  message: Message;
  previous: Message | undefined;
  onOpenDocument: (docId: string) => void;
}) {
  const selfId = useSelf((me) => me.id);
  const { user } = useUser(message.data.userId);
  const isMine = message.data.userId === selfId;
  const grouped =
    previous !== undefined &&
    previous.data.userId === message.data.userId &&
    message.createdAt - previous.createdAt < 5 * 60_000;

  return (
    <li className={grouped ? "-mt-2" : undefined}>
      {!grouped ? (
        <div className="mb-1 flex items-center gap-2">
          <UserAvatar info={user} size={20} />
          <span className="text-xs font-medium">
            {isMine ? "You" : (user?.name ?? message.data.userId)}
          </span>
          <time
            dateTime={new Date(message.createdAt).toISOString()}
            className="text-xs text-neutral-400"
          >
            {formatTime(message.createdAt)}
          </time>
        </div>
      ) : null}
      <div className="pl-7">
        {message.data.kind === "text" ? (
          <p className="text-sm break-words whitespace-pre-wrap">
            {message.data.content}
          </p>
        ) : (
          <SnapshotCard data={message.data} onOpenDocument={onOpenDocument} />
        )}
      </div>
    </li>
  );
}

function formatTime(timestamp: number) {
  const date = new Date(timestamp);
  const sameDay = date.toDateString() === new Date().toDateString();
  return sameDay
    ? date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : date.toLocaleString([], {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
}
