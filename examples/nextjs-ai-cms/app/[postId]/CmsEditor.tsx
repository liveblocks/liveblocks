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
import type { CmsPost, CmsPostPatch } from "../../liveblocks.config";
import { CMS_AI_DRAFT_FEED_ID } from "../config";
import {
  CMS_DRAFT_KEYS,
  draftToStoragePatch,
  mergeDraftWithPost,
} from "../lib/cms-ai-draft";

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
  const { messages } = useFeedMessages(CMS_AI_DRAFT_FEED_ID);

  const [prompt, setPrompt] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateField = useMutation(
    ({ storage }, key: keyof CmsPost, value: string) => {
      storage.get("post").set(key, value);
    },
    []
  );

  const applyPatch = useMutation(({ storage }, patch: CmsPostPatch) => {
    const livePost = storage.get("post");
    for (const k of CMS_DRAFT_KEYS) {
      const v = patch[k];
      if (typeof v === "string") {
        livePost.set(k, v);
      }
    }
  }, []);

  const setEditingField = useMutation(
    ({ setMyPresence }, field: keyof CmsPost | null) => {
      setMyPresence({ editingField: field });
    },
    []
  );

  const clearDraftFeed = useCallback(async () => {
    const res = await fetch("/api/ai-draft/clear", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ roomId }),
    });
    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      throw new Error(body.error ?? res.statusText);
    }
  }, [roomId]);

  const lastDraftSnapshot = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      const d = messages[i].data;
      if ((d.kind === "partial" || d.kind === "complete") && d.draft) {
        return d.draft;
      }
    }
    return null;
  }, [messages]);

  const hasCompleteDraft = useMemo(
    () => messages.some((m) => m.data.kind === "complete" && m.data.draft),
    [messages]
  );

  const feedError = useMemo(() => {
    const last = messages[messages.length - 1];
    if (last?.data.kind === "error") {
      return last.data.message ?? "Draft failed";
    }
    return null;
  }, [messages]);

  const proposedPost = useMemo(() => {
    if (!post || !lastDraftSnapshot) return null;
    return mergeDraftWithPost(post, lastDraftSnapshot);
  }, [post, lastDraftSnapshot]);

  const hasDraftUi =
    Boolean(lastDraftSnapshot) || busy || Boolean(feedError);

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

  const handleAccept = useCallback(async () => {
    const lastComplete = [...messages]
      .reverse()
      .find((m) => m.data.kind === "complete" && m.data.draft);
    if (!lastComplete?.data.draft) return;

    setError(null);
    try {
      const patch = draftToStoragePatch(lastComplete.data.draft);
      applyPatch(patch);
      await clearDraftFeed();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not apply draft");
    }
  }, [applyPatch, clearDraftFeed, messages]);

  const handleCancel = useCallback(async () => {
    setError(null);
    try {
      await clearDraftFeed();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not discard draft");
    }
  }, [clearDraftFeed]);

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
        <div className="mx-auto max-w-3xl space-y-3">
          <div>
            <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-zinc-500">
              Ask AI to edit all fields
            </div>
            <p className="text-xs text-zinc-500">
              Prompt stays local until you send. The suggestion appears directly
              under the input (like Cursor); the form below is unchanged until you
              Accept.
            </p>
          </div>

          <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm ring-1 ring-zinc-950/5">
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder='e.g. "Turn this into a product launch post for next Tuesday"'
              rows={3}
              disabled={busy}
              className="block w-full resize-y border-0 bg-transparent px-3 py-2.5 text-sm text-zinc-900 outline-none placeholder:text-zinc-400 focus:ring-2 focus:ring-inset focus:ring-indigo-200"
            />

            {hasDraftUi ? (
              <div className="border-t border-zinc-200 bg-zinc-50/90">
                <div className="border-l-2 border-l-indigo-500 pl-3 pr-3 py-3">
                  <div className="mb-2 flex min-h-[1.25rem] flex-wrap items-center justify-between gap-2 text-xs">
                    <span className="font-medium text-zinc-600">Suggestion</span>
                    {busy ? (
                      <span className="text-zinc-500">Streaming…</span>
                    ) : feedError ? (
                      <span className="text-red-600">{feedError}</span>
                    ) : hasCompleteDraft ? (
                      <span className="text-emerald-700">Ready to apply</span>
                    ) : null}
                  </div>

                  <div className="max-h-[min(22rem,45vh)] overflow-y-auto pr-1">
                    {proposedPost ? (
                      <DraftFieldReplacement post={post} proposed={proposedPost} />
                    ) : feedError ? (
                      <p className="text-sm text-red-600">{feedError}</p>
                    ) : (
                      <p className="text-sm italic text-zinc-400">Waiting…</p>
                    )}
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2 border-t border-zinc-200/80 pt-3">
                    <button
                      type="button"
                      onClick={() => void handleAccept()}
                      disabled={busy || !hasCompleteDraft || Boolean(feedError)}
                      className="rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Accept
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleCancel()}
                      disabled={busy}
                      className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-800 hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => void runAi()}
              disabled={busy || !prompt.trim()}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {busy ? "Generating…" : "Run AI edit"}
            </button>
            {error ? (
              <span className="text-sm text-red-600">{error}</span>
            ) : null}
          </div>
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

function DraftFieldReplacement({
  post,
  proposed,
}: {
  post: CmsPost;
  proposed: CmsPost;
}) {
  return (
    <div className="space-y-3.5">
      {(Object.keys(FIELD_LABEL) as (keyof CmsPost)[]).map((key) => {
        const cur = post[key];
        const next = proposed[key];
        const changed = next !== cur;
        return (
          <div key={key}>
            <div className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400">
              {FIELD_LABEL[key]}
              {changed ? (
                <span className="ml-1.5 font-normal normal-case text-indigo-600">
                  edited
                </span>
              ) : null}
            </div>
            <div
              className={`mt-1 whitespace-pre-wrap rounded-md bg-white/70 px-2 py-1.5 text-sm leading-relaxed ring-1 ring-inset ring-zinc-200/80 ${
                changed ? "text-zinc-900" : "text-zinc-500"
              }`}
            >
              {next || "—"}
            </div>
          </div>
        );
      })}
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
  const collaboratorHere = useOthers(
    (others) =>
      others.some((o) => o.presence?.editingField === fieldKey),
    shallow
  );

  const multiline = fieldKey === "body" || fieldKey === "excerpt";
  const common =
    "w-full rounded-lg border bg-white px-3 py-2 text-sm outline-none transition-shadow";

  const ring = collaboratorHere
    ? "border-indigo-400 ring-2 ring-indigo-200"
    : "border-zinc-200 focus:ring-2 focus:ring-zinc-300";

  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
        {label}
        {collaboratorHere ? (
          <span className="ml-2 font-normal normal-case text-indigo-600">
            · Someone is editing
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
