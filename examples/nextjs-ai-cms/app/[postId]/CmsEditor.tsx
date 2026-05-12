"use client";

import {
  useFeedMessages,
  useMutation,
  useOthers,
  useRoom,
  useStorage,
  shallow,
  ClientSideSuspense,
} from "@liveblocks/react/suspense";
import { AvatarStack } from "@liveblocks/react-ui";
import { useCallback, useMemo, useState } from "react";
import type { CmsPost } from "../../liveblocks.config";
import { CMS_AI_FEED_ID, AI_CMS_USER_ID } from "../config";

const FIELD_LABEL: Record<keyof CmsPost, string> = {
  title: "Title",
  slug: "Slug",
  excerpt: "Excerpt",
  body: "Body",
  publishedAt: "Published",
};

export function CmsEditor({ postId }: { postId: string }) {
  return (
    <ClientSideSuspense
      fallback={<div className="p-6 text-sm text-zinc-500">Loading room…</div>}
    >
      <CmsEditorInner postId={postId} />
    </ClientSideSuspense>
  );
}

export function CmsEditorInner({ postId }: { postId: string }) {
  void postId;
  const room = useRoom();
  const roomId = room.id;

  const post = useStorage((root) => root.post);
  const { messages } = useFeedMessages(CMS_AI_FEED_ID);

  const [prompt, setPrompt] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateField = useMutation(
    ({ storage }, key: keyof CmsPost, value: string) => {
      storage.get("post").set(key, value);
    },
    []
  );

  const setEditingField = useMutation(
    ({ setMyPresence }, field: keyof CmsPost | null) => {
      setMyPresence({ editingField: field });
    },
    []
  );

  const runAi = useCallback(async () => {
    const trimmed = prompt.trim();
    if (!trimmed || busy) return;

    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/ai-edit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomId, prompt: trimmed }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? res.statusText);
      }
      setPrompt("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Request failed");
    } finally {
      setBusy(false);
    }
  }, [busy, prompt, roomId]);

  const lastFeedLine = useMemo(() => {
    const last = messages[messages.length - 1];
    if (!last) return null;
    const d = last.data;
    if (d.kind === "start") return `Started: ${d.message ?? ""}`;
    if (d.kind === "partial") return "Streaming field updates…";
    if (d.kind === "complete") return "AI edit complete.";
    if (d.kind === "error") return d.message ?? "Error";
    return null;
  }, [messages]);

  if (!post) {
    return null;
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="flex flex-shrink-0 items-center justify-between gap-3 border-b border-zinc-200 bg-white px-4 py-3">
        <div className="min-w-0">
          <h1 className="truncate text-lg font-semibold text-zinc-900">
            {post.title || "Untitled post"}
          </h1>
          <p className="truncate text-xs text-zinc-500">Room: {roomId}</p>
        </div>
        <AvatarStack size={32} />
      </header>

      <div className="flex-shrink-0 border-b border-zinc-200 bg-zinc-50/80 p-4">
        <div className="mx-auto max-w-3xl rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
            Ask AI to edit all fields
          </div>
          <p className="mb-3 text-xs text-zinc-500">
            This prompt stays on your machine until you send it. The model
            streams structured updates into Liveblocks Storage and the feed
            below.
          </p>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder='e.g. "Turn this into a product launch post for next Tuesday"'
            rows={3}
            className="mb-3 w-full resize-y rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm outline-none ring-zinc-400 focus:ring-2"
            disabled={busy}
          />
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => void runAi()}
              disabled={busy || !prompt.trim()}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {busy ? "Running…" : "Run AI edit"}
            </button>
            {error ? (
              <span className="text-sm text-red-600">{error}</span>
            ) : null}
          </div>
          {lastFeedLine ? (
            <p className="mt-3 border-t border-zinc-100 pt-3 text-xs text-zinc-600">
              Feed: {lastFeedLine}
            </p>
          ) : null}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        <div className="mx-auto flex max-w-3xl flex-col gap-5 pb-16">
          {(Object.keys(FIELD_LABEL) as (keyof CmsPost)[]).map((key) => (
            <Field
              key={key}
              fieldKey={key}
              label={FIELD_LABEL[key]}
              value={post[key]}
              disabled={busy}
              onChange={(v) => updateField(key, v)}
              onFocus={() => setEditingField(key)}
              onBlur={() => setEditingField(null)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function Field({
  fieldKey,
  label,
  value,
  disabled,
  onChange,
  onFocus,
  onBlur,
}: {
  fieldKey: keyof CmsPost;
  label: string;
  value: string;
  disabled: boolean;
  onChange: (value: string) => void;
  onFocus: () => void;
  onBlur: () => void;
}) {
  const aiHere = useOthers(
    (others) =>
      others.some(
        (o) => o.id === AI_CMS_USER_ID && o.presence?.editingField === fieldKey
      ),
    shallow
  );

  const multiline = fieldKey === "body" || fieldKey === "excerpt";
  const common =
    "w-full rounded-lg border bg-white px-3 py-2 text-sm outline-none transition-shadow";

  const ring = aiHere
    ? "border-indigo-400 ring-2 ring-indigo-200"
    : "border-zinc-200 focus:ring-2 focus:ring-zinc-300";

  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
        {label}
        {aiHere ? (
          <span className="ml-2 font-normal normal-case text-indigo-600">
            · AI editing
          </span>
        ) : null}
      </span>
      {multiline ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={onFocus}
          onBlur={onBlur}
          disabled={disabled}
          rows={fieldKey === "body" ? 14 : 4}
          className={`${common} ${ring}`}
        />
      ) : (
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={onFocus}
          onBlur={onBlur}
          disabled={disabled}
          className={`${common} ${ring}`}
        />
      )}
    </label>
  );
}
