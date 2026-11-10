"use client";

import { useUser } from "@liveblocks/react";
import {
  CircleAlertIcon,
  CornerDownLeftIcon,
  LoaderCircleIcon,
  LockIcon,
  MailIcon,
  SendIcon,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import type { Conversation } from "@/lib/conversation";
import {
  clearDraft,
  getDraft,
  onDraftRestored,
  saveDraft,
  type ComposerMode,
} from "@/lib/drafts";
import { cn } from "@/lib/utils";
import { AgentAvatar } from "./avatars";

export type { ComposerMode } from "@/lib/drafts";

export function Composer({
  conversation,
  demoMode,
  onSendReply,
  onAddNote,
}: {
  conversation: Conversation;
  // True when replies are simulated (no Resend credentials, or a demo
  // conversation that isn't backed by a real email thread).
  demoMode: boolean;
  onSendReply: (text: string) => Promise<void>;
  onAddNote: (text: string) => Promise<void>;
}) {
  const feedId = conversation.feedId;
  const initial = getDraft(feedId);
  const [mode, setMode] = useState<ComposerMode>(initial?.mode ?? "reply");
  const [text, setText] = useState(initial?.text ?? "");
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(initial?.error ?? null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const resolved = conversation.metadata.status === "resolved";

  // Persist the draft as it changes.
  useEffect(() => {
    if (text || error || getDraft(feedId)) {
      saveDraft(feedId, { mode, text, error });
    }
  }, [feedId, mode, text, error]);

  // A reply that failed to send after leaving the composer comes back here,
  // with the reason, so nothing the agent wrote is lost.
  useEffect(
    () =>
      onDraftRestored((restoredFeedId, draft) => {
        if (restoredFeedId !== feedId) return;
        setMode(draft.mode);
        setText(draft.text);
        setError(draft.error);
        textareaRef.current?.focus();
      }),
    [feedId]
  );

  // Auto-grow the textarea with its content.
  useLayoutEffect(() => {
    const node = textareaRef.current;
    if (!node) return;
    node.style.height = "0px";
    node.style.height = `${Math.min(Math.max(node.scrollHeight, 88), 320)}px`;
  }, [text, mode]);

  const canSend = text.trim().length > 0 && !isSending;

  const submit = useCallback(async () => {
    const value = text.trim();
    if (!value || isSending) return;
    setIsSending(true);
    setError(null);
    try {
      if (mode === "reply") {
        await onSendReply(value);
      } else {
        await onAddNote(value);
      }
      // Replies resolve as soon as they're in the feed (they show as
      // "sending" until the email goes out). If sending fails later, the
      // text is restored here via `restoreFailedReply`.
      setText("");
      clearDraft(feedId);
      textareaRef.current?.focus();
    } catch (cause) {
      setError(
        cause instanceof Error && cause.message
          ? cause.message
          : "Something went wrong. Your draft is still here."
      );
    } finally {
      setIsSending(false);
    }
  }, [text, isSending, mode, onSendReply, onAddNote, feedId]);

  const mentions = useMentions({ enabled: mode === "note", text, textareaRef, setText });

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (mentions.onKeyDown(event)) return;
    if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
      event.preventDefault();
      void submit();
      return;
    }
    // ⌘⇧N toggles between replying and writing an internal note.
    if (
      (event.metaKey || event.ctrlKey) &&
      event.shiftKey &&
      event.key.toLowerCase() === "n"
    ) {
      event.preventDefault();
      setMode((current) => (current === "reply" ? "note" : "reply"));
    }
  };

  const isNote = mode === "note";

  return (
    <div className="shrink-0 border-t border-line bg-surface">
      <div className="mx-auto w-full max-w-[760px] px-6 pt-3 pb-4 md:px-10">
        <div
          className={cn(
            "relative rounded-lg border transition-colors",
            isNote
              ? "border-note-line bg-note"
              : "border-line bg-surface focus-within:border-line-strong"
          )}
        >
          {/* Mode tabs */}
          <div className="flex items-center justify-between px-2 pt-2">
            <div
              className="inline-flex items-center gap-0.5 rounded-md bg-ink/4 p-0.5"
              role="tablist"
              aria-label="Composer mode"
            >
              <ModeTab
                active={!isNote}
                onClick={() => setMode("reply")}
                icon={<MailIcon className="size-3.5" />}
                label="Reply"
              />
              <ModeTab
                active={isNote}
                onClick={() => setMode("note")}
                icon={<LockIcon className="size-3.5" />}
                label="Internal note"
                shortcut="⌘⇧N"
                tone="note"
              />
            </div>
            <span className="hidden items-center gap-1 pr-1 text-[11px] text-ink-faint sm:inline-flex">
              <kbd className="rounded border border-line bg-surface px-1 font-sans text-[10px] text-ink-muted">
                ⌘
              </kbd>
              <kbd className="rounded border border-line bg-surface px-1 font-sans text-[10px] text-ink-muted">
                <CornerDownLeftIcon className="inline size-2.5" />
              </kbd>
              to send
            </span>
          </div>

          <div className="relative">
            <textarea
              ref={textareaRef}
              value={text}
              onChange={(event) => {
                setText(event.target.value);
                if (error) setError(null);
              }}
              onKeyDown={onKeyDown}
              onBlur={mentions.onBlur}
              disabled={isSending}
              rows={3}
              placeholder={
                isNote
                  ? `Add a note for your team… type @ to mention someone`
                  : resolved
                    ? `Reply to ${conversation.metadata.customerName} (this will reopen the conversation)`
                    : `Reply to ${conversation.metadata.customerName}…`
              }
              aria-label={isNote ? "Internal note" : "Reply"}
              className={cn(
                "scroll-quiet block w-full resize-none bg-transparent px-3.5 pt-3 pb-2 text-[14px] leading-[1.6] text-ink placeholder:text-ink-faint focus:outline-none disabled:opacity-60"
              )}
            />
            {mentions.open ? (
              <MentionSuggestions
                userIds={mentions.suggestions}
                activeIndex={mentions.activeIndex}
                onPick={mentions.pick}
              />
            ) : null}
          </div>

          <div className="flex items-center justify-between gap-3 px-3 pb-2.5">
            <div className="flex min-w-0 items-center gap-1.5 text-[11px] text-ink-muted">
              {isNote ? (
                <>
                  <LockIcon className="size-3 shrink-0 text-note-ink" />
                  <span className="truncate">
                    Only visible to your team. Never sent to the customer.
                  </span>
                </>
              ) : demoMode ? (
                <>
                  <CircleAlertIcon className="size-3 shrink-0" />
                  <span className="truncate">
                    Demo mode — replies are simulated and not delivered.
                  </span>
                </>
              ) : (
                <>
                  <MailIcon className="size-3 shrink-0" />
                  <span className="truncate">
                    Emails {conversation.metadata.customerEmail} via Resend.
                  </span>
                </>
              )}
            </div>

            <button
              type="button"
              onClick={() => void submit()}
              disabled={!canSend}
              className={cn(
                "inline-flex h-7 shrink-0 items-center gap-1.5 rounded-md px-3 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 disabled:cursor-not-allowed disabled:opacity-40",
                isNote
                  ? "bg-note-ink text-surface hover:bg-note-ink/90"
                  : "bg-ink text-surface hover:bg-ink/90"
              )}
            >
              {isSending ? (
                <LoaderCircleIcon className="size-3.5 animate-spin" />
              ) : isNote ? (
                <LockIcon className="size-3.5" />
              ) : (
                <SendIcon className="size-3.5" />
              )}
              {isSending
                ? isNote
                  ? "Adding…"
                  : "Sending…"
                : isNote
                  ? "Add note"
                  : "Send reply"}
            </button>
          </div>
        </div>

        {error ? (
          <div
            role="alert"
            className="mt-2 flex items-start gap-2 rounded-md border border-urgent/20 bg-urgent/5 px-3 py-2 text-xs text-urgent"
          >
            <CircleAlertIcon className="mt-px size-3.5 shrink-0" />
            <span className="min-w-0 flex-1">{error}</span>
            <button
              type="button"
              onClick={() => void submit()}
              className="shrink-0 font-medium underline-offset-2 hover:underline"
            >
              Retry
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function ModeTab({
  active,
  onClick,
  icon,
  label,
  shortcut,
  tone = "default",
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  shortcut?: string;
  tone?: "default" | "note";
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      title={shortcut ? `${label} (${shortcut})` : label}
      className={cn(
        "inline-flex h-6 items-center gap-1.5 rounded-[5px] px-2 text-xs font-medium transition-colors",
        active
          ? tone === "note"
            ? "bg-surface text-note-ink shadow-xs"
            : "bg-surface text-ink shadow-xs"
          : "text-ink-muted hover:text-ink"
      )}
    >
      {icon}
      {label}
    </button>
  );
}

// ---------------------------------------------------------------------------
// @-mentions for internal notes. Typing "@" opens a list of teammates
// (resolved through `/api/users/search`); picking one inserts "@Full Name".

function useMentions({
  enabled,
  text,
  textareaRef,
  setText,
}: {
  enabled: boolean;
  text: string;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  setText: (text: string) => void;
}) {
  const [query, setQuery] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [users, setUsers] = useState<Map<string, string>>(new Map());

  // Detect an "@query" right before the caret.
  useEffect(() => {
    if (!enabled) {
      setQuery(null);
      return;
    }
    const node = textareaRef.current;
    const caret = node?.selectionStart ?? text.length;
    const before = text.slice(0, caret);
    const match = before.match(/(?:^|\s)@([^\s@]*(?:\s[^\s@]*)?)$/);
    setQuery(match ? match[1] : null);
  }, [enabled, text, textareaRef]);

  useEffect(() => {
    if (query === null) {
      setSuggestions([]);
      return;
    }
    let cancelled = false;
    fetch(`/api/users/search?text=${encodeURIComponent(query)}`)
      .then((response) => (response.ok ? response.json() : []))
      .then((ids: string[]) => {
        if (!cancelled) {
          setSuggestions(ids.slice(0, 5));
          setActiveIndex(0);
        }
      })
      .catch(() => {
        if (!cancelled) setSuggestions([]);
      });
    return () => {
      cancelled = true;
    };
  }, [query]);

  // Names are needed to insert the mention text; `/api/users` resolves them.
  useEffect(() => {
    const missing = suggestions.filter((id) => !users.has(id));
    if (missing.length === 0) return;
    const search = new URLSearchParams(missing.map((id) => ["userIds", id]));
    fetch(`/api/users?${search}`)
      .then((response) => (response.ok ? response.json() : []))
      .then((infos: ({ name: string } | null)[]) => {
        setUsers((previous) => {
          const next = new Map(previous);
          missing.forEach((id, index) => {
            const info = infos[index];
            if (info?.name) next.set(id, info.name);
          });
          return next;
        });
      })
      .catch(() => {});
  }, [suggestions, users]);

  const open = enabled && query !== null && suggestions.length > 0;

  const pick = useCallback(
    (userId: string) => {
      const name = users.get(userId);
      const node = textareaRef.current;
      if (!name || !node || query === null) return;
      const caret = node.selectionStart ?? text.length;
      const before = text.slice(0, caret);
      const start = before.lastIndexOf(`@${query}`);
      if (start === -1) return;
      const next = `${text.slice(0, start)}@${name} ${text.slice(caret)}`;
      setText(next);
      setQuery(null);
      requestAnimationFrame(() => {
        const position = start + name.length + 2;
        node.focus();
        node.setSelectionRange(position, position);
      });
    },
    [users, textareaRef, query, text, setText]
  );

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (!open) return false;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((index) => (index + 1) % suggestions.length);
      return true;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex(
        (index) => (index - 1 + suggestions.length) % suggestions.length
      );
      return true;
    }
    if (event.key === "Enter" || event.key === "Tab") {
      event.preventDefault();
      pick(suggestions[activeIndex]);
      return true;
    }
    if (event.key === "Escape") {
      event.preventDefault();
      setQuery(null);
      return true;
    }
    return false;
  };

  const onBlur = () => {
    // Delay so a click on a suggestion registers first.
    setTimeout(() => setQuery(null), 150);
  };

  return { open, suggestions, activeIndex, pick, onKeyDown, onBlur };
}

function MentionSuggestions({
  userIds,
  activeIndex,
  onPick,
}: {
  userIds: string[];
  activeIndex: number;
  onPick: (userId: string) => void;
}) {
  return (
    <div
      role="listbox"
      className="absolute bottom-full left-3 z-20 mb-1 w-64 overflow-hidden rounded-md border border-line bg-surface p-1 shadow-lg shadow-ink/5 animate-in fade-in-0 zoom-in-95"
    >
      {userIds.map((userId, index) => (
        <MentionSuggestion
          key={userId}
          userId={userId}
          active={index === activeIndex}
          onPick={() => onPick(userId)}
        />
      ))}
    </div>
  );
}

function MentionSuggestion({
  userId,
  active,
  onPick,
}: {
  userId: string;
  active: boolean;
  onPick: () => void;
}) {
  const { user } = useUser(userId);
  return (
    <button
      type="button"
      role="option"
      aria-selected={active}
      onMouseDown={(event) => {
        event.preventDefault();
        onPick();
      }}
      className={cn(
        "flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-[13px]",
        active ? "bg-hover text-ink" : "text-ink-secondary hover:bg-hover"
      )}
    >
      <AgentAvatar userId={userId} size="sm" />
      <span className="flex-1 truncate">{user?.name ?? "…"}</span>
      <span className="truncate text-[11px] text-ink-faint">{user?.title}</span>
    </button>
  );
}
