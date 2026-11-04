"use client";

// Non-suspense variant so the loading state renders inside the panel
import { useFeedMessages, useFileUrl } from "@liveblocks/react";
import {
  ClientSideSuspense,
  useSelf,
  useUser,
} from "@liveblocks/react/suspense";
import {
  ArrowUpRightIcon,
  DownloadIcon,
  FileIcon,
  Loader2Icon,
  PaperclipIcon,
  SendHorizonalIcon,
  SparklesIcon,
  XIcon,
} from "lucide-react";
import {
  type DragEvent,
  type FormEvent,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/user-avatar";
import {
  AI_MENTION,
  AI_MENTION_CLASS,
  splitAiMentions,
} from "@/lib/ai-mention";
import { cn } from "@/lib/utils";
import { ChatComposer, type ChatComposerHandle } from "./composer";
import { SnapshotCard } from "./snapshot-card";
import { getChatFeedId } from "./feed";
import { useChat } from "./use-chat";

type Message = {
  id: string;
  createdAt: number;
  data: Liveblocks["FeedMessageData"];
};

type TextMessage = Extract<Liveblocks["FeedMessageData"], { kind: "text" }>;
type ChatAttachment = NonNullable<TextMessage["attachments"]>[number];

// How much of the conversation the AI assistant gets to see
const AI_HISTORY_LENGTH = 12;

export function ChatPanel({
  activeDocId,
  onOpenDocument,
}: {
  activeDocId: string | null;
  onOpenDocument: (docId: string) => void;
}) {
  const { roomId, sendText } = useChat();
  const result = useFeedMessages(getChatFeedId(roomId));
  const messages = result.messages ?? [];
  const { isLoading, hasFetchedAll, fetchMore, isFetchingMore } = result;
  const listRef = useRef<HTMLDivElement>(null);
  const composerRef = useRef<ChatComposerHandle>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragDepth = useRef(0);
  const stickToBottom = useRef(true);
  // Plain-text mirror of the composer, for the send button and submit
  const [draft, setDraft] = useState("");
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [draggingFiles, setDraggingFiles] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  function addFiles(list: FileList | File[]) {
    const next = Array.from(list);
    if (next.length === 0) return;
    setPendingFiles((current) => [...current, ...next]);
    setError(null);
  }

  function onComposerDragEnter(event: DragEvent) {
    if (!event.dataTransfer.types.includes("Files")) return;
    event.preventDefault();
    dragDepth.current += 1;
    setDraggingFiles(true);
  }

  function onComposerDragOver(event: DragEvent) {
    if (!event.dataTransfer.types.includes("Files")) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
  }

  function onComposerDragLeave(event: DragEvent) {
    if (!event.dataTransfer.types.includes("Files")) return;
    event.preventDefault();
    dragDepth.current -= 1;
    if (dragDepth.current <= 0) {
      dragDepth.current = 0;
      setDraggingFiles(false);
    }
  }

  function onComposerDrop(event: DragEvent) {
    if (!event.dataTransfer.types.includes("Files")) return;
    event.preventDefault();
    dragDepth.current = 0;
    setDraggingFiles(false);
    addFiles(event.dataTransfer.files);
  }

  const sorted = [...(messages as Message[])].sort(
    (a, b) => a.createdAt - b.createdAt
  );

  async function submit(event?: FormEvent) {
    event?.preventDefault();
    const files = pendingFiles;
    if ((!draft.trim() && files.length === 0) || sending) return;
    setSending(true);
    setError(null);
    try {
      const history = sorted
        .map((message) => message.data)
        .filter((data): data is TextMessage => data.kind === "text")
        .filter((data) => data.content && !data.streaming)
        .slice(-AI_HISTORY_LENGTH)
        .map(({ userId, content }) => ({ userId, content }));
      await sendText(draft, files, { activeDocId, history });
      setDraft("");
      composerRef.current?.clear();
      setPendingFiles([]);
      stickToBottom.current = true;
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Couldn't send that message"
      );
    } finally {
      setSending(false);
    }
  }

  // Starts a message to the assistant
  function askAi() {
    composerRef.current?.mentionAi();
  }

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
            No messages yet. Say hi, drop a file, or send a document page here
            with the <span className="font-medium">Send to chat</span> button.
            Mention{" "}
            <span className="font-medium text-violet-600">{AI_MENTION}</span> to
            have it add a conjugation table, translate a paragraph, or draw on
            the whiteboard.
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
        onDragEnter={onComposerDragEnter}
        onDragOver={onComposerDragOver}
        onDragLeave={onComposerDragLeave}
        onDrop={onComposerDrop}
        className={cn(
          "flex flex-col gap-2 border-t border-neutral-200 p-3",
          draggingFiles && "bg-neutral-50 outline outline-2 outline-neutral-900"
        )}
      >
        {pendingFiles.length > 0 ? (
          <ul className="flex flex-wrap gap-1.5">
            {pendingFiles.map((file, index) => (
              <li
                key={`${file.name}-${file.size}-${index}`}
                className="flex max-w-full items-center gap-1 rounded-md bg-neutral-100 px-2 py-1 text-xs"
              >
                <FileIcon className="size-3 shrink-0 text-neutral-500" />
                <span className="max-w-40 truncate">{file.name}</span>
                <button
                  type="button"
                  className="text-neutral-500 hover:text-neutral-900"
                  aria-label={`Remove ${file.name}`}
                  onClick={() =>
                    setPendingFiles((current) =>
                      current.filter((_, fileIndex) => fileIndex !== index)
                    )
                  }
                >
                  <XIcon className="size-3" />
                </button>
              </li>
            ))}
          </ul>
        ) : null}
        <div className="flex items-end gap-2">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="sr-only"
            onChange={(event) => {
              if (event.target.files) addFiles(event.target.files);
              event.target.value = "";
            }}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            disabled={sending}
            aria-label="Attach files"
            className="mb-0.5 text-neutral-500"
            onClick={() => fileInputRef.current?.click()}
          >
            <PaperclipIcon />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            disabled={sending}
            aria-label="Ask the AI assistant"
            title="Ask the AI assistant"
            className="mb-0.5 -ml-1 text-neutral-500"
            onClick={askAi}
          >
            <SparklesIcon />
          </Button>
          <ChatComposer
            ref={composerRef}
            onChange={setDraft}
            onSubmit={() => void submit()}
          />
          <Button
            type="submit"
            size="icon"
            disabled={(!draft.trim() && pendingFiles.length === 0) || sending}
            aria-label="Send"
          >
            {sending ? (
              <Loader2Icon className="animate-spin" />
            ) : (
              <SendHorizonalIcon />
            )}
          </Button>
        </div>
        {error ? <p className="text-xs text-red-600">{error}</p> : null}
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
  const grouped =
    previous !== undefined &&
    previous.data.userId === message.data.userId &&
    message.createdAt - previous.createdAt < 5 * 60_000;

  return (
    <li className={grouped ? "-mt-2" : undefined}>
      {!grouped ? (
        <div className="mb-1 flex items-center gap-2">
          {/* Resolving the author suspends; keep it to this one header */}
          <ClientSideSuspense
            fallback={<MessageAuthor userId={message.data.userId} />}
          >
            <ResolvedMessageAuthor userId={message.data.userId} />
          </ClientSideSuspense>
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
          <TextMessageBody
            data={message.data}
            onOpenDocument={onOpenDocument}
          />
        ) : (
          <SnapshotCard data={message.data} onOpenDocument={onOpenDocument} />
        )}
      </div>
    </li>
  );
}

function ResolvedMessageAuthor({ userId }: { userId: string }) {
  const selfId = useSelf((me) => me.id);
  const { user } = useUser(userId);
  return (
    <MessageAuthor
      userId={userId}
      info={user}
      name={userId === selfId ? "You" : user?.name}
    />
  );
}

function MessageAuthor({
  userId,
  info,
  name,
}: {
  userId: string;
  info?: Liveblocks["UserMeta"]["info"];
  name?: string;
}) {
  return (
    <>
      <UserAvatar info={info} size={20} />
      <span className="text-xs font-medium">{name ?? userId}</span>
    </>
  );
}

function TextMessageBody({
  data,
  onOpenDocument,
}: {
  data: TextMessage;
  onOpenDocument: (docId: string) => void;
}) {
  return (
    <>
      {data.content ? (
        <p className="text-sm break-words whitespace-pre-wrap">
          <MessageText text={data.content} />
          {data.streaming ? <StreamingCursor /> : null}
        </p>
      ) : data.streaming ? (
        <p className="flex items-center gap-1.5 text-sm text-neutral-500">
          <Loader2Icon className="size-3.5 animate-spin" />
          {data.status ?? "Thinking…"}
        </p>
      ) : null}
      {data.content && data.streaming && data.status ? (
        <p className="mt-1 flex items-center gap-1.5 text-xs text-neutral-500">
          <Loader2Icon className="size-3 animate-spin" />
          {data.status}
        </p>
      ) : null}
      {data.actions && data.actions.length > 0 ? (
        <ul className="mt-1.5 flex flex-col gap-1">
          {data.actions.map((action, index) => (
            <li key={`${action.docId}-${index}`}>
              <button
                type="button"
                onClick={() => onOpenDocument(action.docId)}
                className="inline-flex max-w-full items-center gap-1.5 rounded-md border border-violet-200 bg-violet-50 px-2 py-1 text-xs text-violet-800 hover:bg-violet-100"
              >
                <SparklesIcon className="size-3 shrink-0" aria-hidden />
                <span className="truncate">{action.label}</span>
                <ArrowUpRightIcon
                  className="size-3 shrink-0 text-violet-500"
                  aria-hidden
                />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      {data.attachments?.map((file) => (
        <ChatAttachmentCard key={file.fileId} file={file} />
      ))}
    </>
  );
}

// Message text with assistant mentions highlighted
function MessageText({ text }: { text: string }) {
  return splitAiMentions(text).map((part, index) =>
    part.mention ? (
      <span key={index} className={AI_MENTION_CLASS}>
        {part.text}
      </span>
    ) : (
      <span key={index}>{part.text}</span>
    )
  );
}

function StreamingCursor() {
  return (
    <span
      aria-hidden
      className="ml-0.5 inline-block h-3.5 w-0.5 translate-y-0.5 animate-pulse bg-neutral-400"
    />
  );
}

function ChatAttachmentCard({ file }: { file: ChatAttachment }) {
  const { url, isLoading, error } = useFileUrl(file.fileId);
  const isImage = file.mimeType.startsWith("image/");

  async function download() {
    if (!url) return;
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error("Download failed");
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = objectUrl;
      anchor.download = file.name;
      document.body.append(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(objectUrl);
    } catch {
      window.open(url, "_blank", "noopener,noreferrer");
    }
  }

  return (
    <div className="mt-1 overflow-hidden rounded-md border border-neutral-200 bg-neutral-50">
      {isImage && url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={url}
          alt=""
          className="max-h-40 w-full border-b border-neutral-200 bg-white object-contain"
        />
      ) : null}
      <div className="flex items-center gap-2 px-2 py-1.5">
        <FileIcon className="size-4 shrink-0 text-neutral-500" aria-hidden />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm">{file.name}</span>
          <span className="block text-xs text-neutral-500">
            {formatBytes(file.size)}
          </span>
        </span>
        {error ? (
          <span className="text-xs text-neutral-500">Unavailable</span>
        ) : (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            disabled={isLoading || !url}
            aria-label={`Download ${file.name}`}
            onClick={() => void download()}
          >
            {isLoading ? (
              <Loader2Icon className="animate-spin" />
            ) : (
              <DownloadIcon />
            )}
          </Button>
        )}
      </div>
    </div>
  );
}

function formatBytes(size: number) {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${Math.round(size / 102.4) / 10} KB`;
  return `${Math.round(size / (1024 * 102.4)) / 10} MB`;
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
