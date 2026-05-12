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
import { useCallback, useEffect, useMemo, useState } from "react";
import type {
  CmsPost,
  CmsAiDraftSnapshot,
  CmsAiFieldPhaseLabel,
} from "../../liveblocks.config";
import { CMS_AI_DRAFT_FEED_ID } from "../config";
import { CMS_DRAFT_KEYS, mergeDraftWithPost } from "../lib/cms-ai-draft";

const FIELD_LABEL: Record<keyof CmsPost, string> = {
  title: "Title",
  slug: "Slug",
  excerpt: "Excerpt",
  body: "Body",
  publishedAt: "Published",
};

function fieldPhaseLabel(phase: CmsAiFieldPhaseLabel): string {
  switch (phase) {
    case "waiting":
      return "Waiting";
    case "unchanged":
      return "No change";
    case "streaming":
      return "Generating";
    case "ready":
      return "Suggestion";
    case "complete":
      return "Suggestion";
    case "error":
      return "Error";
    default:
      return phase;
  }
}

export function CmsEditor({ postId }: { postId: string }) {
  return (
    <ClientSideSuspense fallback={<CmsEditorBodyFallback />}>
      <CmsEditorInner postId={postId} />
    </ClientSideSuspense>
  );
}

function CmsEditorBodyFallback() {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex-shrink-0 border-b border-zinc-200 bg-zinc-50/80 p-4">
        <div className="mx-auto max-w-3xl space-y-3">
          <div className="h-3 w-36 rounded bg-zinc-200/80" />
          <div className="h-3 max-w-lg rounded bg-zinc-200/50" />
          <div className="h-[4.5rem] rounded-xl border border-zinc-200 bg-zinc-100/90" />
          <div className="h-9 w-28 rounded-lg bg-zinc-200/70" />
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-hidden p-4">
        <div className="mx-auto max-w-3xl space-y-5">
          {[40, 40, 56, 160, 40].map((h, i) => (
            <div key={i} className="space-y-2">
              <div className="h-3 w-20 rounded bg-zinc-200/70" />
              <div
                className="rounded-lg border border-zinc-200 bg-zinc-50/90"
                style={{ height: h }}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function CmsEditorInner({ postId }: { postId: string }) {
  void postId;
  const room = useRoom();
  const roomId = room.id;

  const post = useStorage((root) => root.post);
  const { messages } = useFeedMessages(CMS_AI_DRAFT_FEED_ID);

  /** Only messages from the latest `start` onward (new run drops stale client feed tail). */
  const messagesForCurrentRun = useMemo(() => {
    let lastStart = -1;
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i]?.data.kind === "start") {
        lastStart = i;
        break;
      }
    }
    if (lastStart < 0) {
      return [];
    }
    return messages.slice(lastStart);
  }, [messages]);

  const startMessage = useMemo(() => {
    const first = messagesForCurrentRun[0];
    return first?.data.kind === "start" ? first : undefined;
  }, [messagesForCurrentRun]);

  const [prompt, setPrompt] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dismissedFields, setDismissedFields] = useState<Set<keyof CmsPost>>(
    () => new Set()
  );

  const updateField = useMutation(
    ({ storage }, key: keyof CmsPost, value: string) => {
      storage.get("post").set(key, value);
    },
    []
  );

  const applyManyFields = useMutation(
    ({ storage }, patches: Partial<CmsPost>) => {
      const live = storage.get("post");
      for (const k of CMS_DRAFT_KEYS) {
        const v = patches[k];
        if (typeof v === "string") {
          live.set(k, v);
        }
      }
    },
    []
  );

  const setEditingField = useMutation(
    ({ setMyPresence }, field: keyof CmsPost | null) => {
      setMyPresence({ editingField: field });
    },
    []
  );

  const runId = startMessage?.id;

  useEffect(() => {
    setDismissedFields(new Set());
  }, [runId]);

  const feedSlices = useMemo(() => {
    let lastStatus: { phase?: string; message?: string } | null = null;
    const lastFieldPhases: Partial<Record<keyof CmsPost, CmsAiFieldPhaseLabel>> =
      {};
    let lastDraftSnap: CmsAiDraftSnapshot | null = null;
    let feedError: string | null = null;

    for (const m of messagesForCurrentRun) {
      const d = m.data;
      if (d.kind === "status") {
        lastStatus = { phase: d.phase, message: d.message };
      }
      if (d.kind === "field_phases" && d.fieldPhases) {
        for (const fp of d.fieldPhases) {
          lastFieldPhases[fp.field] = fp.phase;
        }
      }
      if ((d.kind === "partial" || d.kind === "complete") && d.draft) {
        lastDraftSnap = d.draft;
      }
      if (d.kind === "error") {
        feedError = d.message ?? "Error";
      }
    }

    return {
      lastStatus,
      lastFieldPhases,
      lastDraftSnap,
      feedError,
    };
  }, [messagesForCurrentRun]);

  const proposedPost = useMemo(() => {
    if (!post || !feedSlices.lastDraftSnap) return null;
    return mergeDraftWithPost(post, feedSlices.lastDraftSnap);
  }, [post, feedSlices.lastDraftSnap]);

  const hasSuggestionRun = Boolean(startMessage);
  const hasDraftUi =
    hasSuggestionRun || busy || Boolean(feedSlices.feedError);

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

  const dismissField = useCallback((key: keyof CmsPost) => {
    setDismissedFields((prev) => new Set(prev).add(key));
  }, []);

  const bulkSuggestionActions = useMemo(() => {
    const empty = {
      keepAllPairs: [] as { key: keyof CmsPost; value: string }[],
      visibleSuggestionKeys: [] as (keyof CmsPost)[],
      canKeepAll: false,
      canUndoAll: false,
    };

    if (!post) {
      return empty;
    }

    const keepAllPairs: { key: keyof CmsPost; value: string }[] = [];
    const visibleSuggestionKeys: (keyof CmsPost)[] = [];

    for (const key of CMS_DRAFT_KEYS) {
      const phase = feedSlices.lastFieldPhases[key] ?? "waiting";
      const snapVal = feedSlices.lastDraftSnap?.[key];
      const hasActualSuggestion =
        typeof snapVal === "string" && snapVal !== post[key];
      const showAiRow =
        hasDraftUi &&
        !dismissedFields.has(key) &&
        hasActualSuggestion &&
        phase !== "unchanged" &&
        phase !== "error";

      const acceptDisabled =
        typeof snapVal !== "string" ||
        snapVal === post[key] ||
        (phase !== "ready" && phase !== "complete");

      if (showAiRow) {
        visibleSuggestionKeys.push(key);
      }
      if (showAiRow && !acceptDisabled && typeof snapVal === "string") {
        keepAllPairs.push({ key, value: snapVal });
      }
    }

    return {
      keepAllPairs,
      visibleSuggestionKeys,
      canKeepAll: keepAllPairs.length > 0,
      canUndoAll: visibleSuggestionKeys.length > 0,
    };
  }, [
    post,
    dismissedFields,
    hasDraftUi,
    feedSlices.lastDraftSnap,
    feedSlices.lastFieldPhases,
  ]);

  const handleKeepAll = useCallback(() => {
    const patch: Partial<CmsPost> = {};
    for (const { key, value } of bulkSuggestionActions.keepAllPairs) {
      patch[key] = value;
    }
    if (Object.keys(patch).length > 0) {
      applyManyFields(patch);
    }
  }, [applyManyFields, bulkSuggestionActions.keepAllPairs]);

  const handleUndoAll = useCallback(() => {
    setDismissedFields((prev) => {
      const next = new Set(prev);
      for (const k of bulkSuggestionActions.visibleSuggestionKeys) {
        next.add(k);
      }
      return next;
    });
  }, [bulkSuggestionActions.visibleSuggestionKeys]);

  if (!post) {
    return <CmsEditorBodyFallback />;
  }

  return (
    <>
      <div className="flex-shrink-0 border-b border-zinc-200 bg-zinc-50/80 p-4">
        <div className="mx-auto max-w-3xl space-y-3">
          <div>
            <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-zinc-500">
              Ask AI to edit all fields
            </div>
            <p className="text-xs text-zinc-500">
              Suggestions stream on the feed and appear under each field (light
              green). Use Accept or Undo per field. Storage updates only when you
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
          </div>

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
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        <div className="mx-auto flex max-w-3xl flex-col gap-5 pb-16">
          {bulkSuggestionActions.canUndoAll ? (
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200 pb-4">
              <span className="text-xs font-medium text-zinc-500">
                All fields
              </span>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => handleKeepAll()}
                  disabled={busy || !bulkSuggestionActions.canKeepAll}
                  className="rounded-lg bg-emerald-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Keep all
                </button>
                <button
                  type="button"
                  onClick={() => handleUndoAll()}
                  disabled={busy}
                  className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-800 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Undo all
                </button>
              </div>
            </div>
          ) : null}
          {(Object.keys(FIELD_LABEL) as (keyof CmsPost)[]).map((key) => {
            const phase = feedSlices.lastFieldPhases[key] ?? "waiting";
            const proposed = proposedPost?.[key] ?? post[key];
            const snapVal = feedSlices.lastDraftSnap?.[key];
            const hasActualSuggestion =
              typeof snapVal === "string" && snapVal !== post[key];
            const showAiRow =
              hasDraftUi &&
              !dismissedFields.has(key) &&
              hasActualSuggestion &&
              phase !== "unchanged" &&
              phase !== "error";

            const acceptDisabled =
              typeof snapVal !== "string" ||
              snapVal === post[key] ||
              (phase !== "ready" && phase !== "complete");

            return (
              <Field
                key={key}
                fieldKey={key}
                label={FIELD_LABEL[key]}
                value={post[key]}
                disabled={busy}
                onChange={(v) => updateField(key, v)}
                onFocus={() => setEditingField(key)}
                onBlur={() => setEditingField(null)}
                showAiRow={showAiRow}
                fieldPhase={phase}
                phaseCaption={fieldPhaseLabel(phase)}
                proposedText={proposed}
                feedError={feedSlices.feedError}
                acceptDisabled={acceptDisabled}
                onAccept={() => {
                  if (typeof snapVal === "string") {
                    updateField(key, snapVal);
                  }
                }}
                onUndo={() => dismissField(key)}
              />
            );
          })}
        </div>
      </div>
    </>
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
  showAiRow,
  fieldPhase,
  phaseCaption,
  proposedText,
  feedError,
  acceptDisabled,
  onAccept,
  onUndo,
}: {
  fieldKey: keyof CmsPost;
  label: string;
  value: string;
  disabled: boolean;
  onChange: (value: string) => void;
  onFocus: () => void;
  onBlur: () => void;
  showAiRow: boolean;
  fieldPhase: CmsAiFieldPhaseLabel;
  phaseCaption: string;
  proposedText: string;
  feedError: string | null;
  acceptDisabled: boolean;
  onAccept: () => void;
  onUndo: () => void;
}) {
  const collaboratorHere = useOthers(
    (others) =>
      others.some((o) => o.presence?.editingField === fieldKey),
    shallow
  );

  const multiline = fieldKey === "body" || fieldKey === "excerpt";
  const textareaRows = fieldKey === "body" ? 14 : 4;
  const joined = showAiRow;

  const controlBase =
    "w-full px-3 py-2 text-sm outline-none transition-shadow";

  const controlNeutral = `${controlBase} rounded-lg border border-zinc-200 bg-white`;
  const controlWithSuggestion = `${controlBase} block rounded-none border-0 bg-rose-50`;

  const ringNeutral = collaboratorHere
    ? "border-indigo-400 ring-2 ring-indigo-200"
    : "border-zinc-200 focus:ring-2 focus:ring-zinc-300";

  const controlClass = joined
    ? `${controlWithSuggestion} ${collaboratorHere ? "ring-2 ring-inset ring-indigo-200" : "focus:ring-2 focus:ring-inset focus:ring-rose-200/70"}`
    : `${controlNeutral} ${ringNeutral}`;

  const suggestionBlock = showAiRow ? (
    <div className="rounded-b-lg bg-emerald-50 px-3 py-2">
      <div className="mb-1 flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
        <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-900/90">
          <span>AI · {phaseCaption}</span>
          {fieldPhase === "error" && feedError ? (
            <span className="font-normal normal-case text-red-600">
              {feedError}
            </span>
          ) : null}
        </div>
        <div className="flex shrink-0 flex-row items-center gap-1.5">
          <button
            type="button"
            onClick={onAccept}
            disabled={acceptDisabled}
            className="rounded-md bg-emerald-700 px-2 py-0.5 text-[11px] font-semibold text-white hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Accept
          </button>
          <button
            type="button"
            onClick={onUndo}
            className="rounded-md border border-emerald-300/90 bg-white px-2 py-0.5 text-[11px] font-semibold text-emerald-900 hover:bg-emerald-100/60"
          >
            Undo
          </button>
        </div>
      </div>
      {multiline ? (
        <textarea
          readOnly
          tabIndex={-1}
          aria-label="AI suggestion"
          rows={textareaRows}
          value={
            fieldPhase === "waiting" && proposedText === value
              ? ""
              : proposedText || "—"
          }
          placeholder={
            fieldPhase === "waiting" && proposedText === value
              ? "Waiting for model…"
              : undefined
          }
          className="w-full resize-none border-0 bg-transparent px-0 py-0 text-sm leading-normal text-zinc-800 outline-none read-only:cursor-default"
        />
      ) : (
        <input
          readOnly
          tabIndex={-1}
          type="text"
          aria-label="AI suggestion"
          value={
            fieldPhase === "waiting" && proposedText === value
              ? ""
              : proposedText || "—"
          }
          placeholder={
            fieldPhase === "waiting" && proposedText === value
              ? "Waiting for model…"
              : undefined
          }
          className="w-full border-0 bg-transparent px-0 py-0 text-sm leading-normal text-zinc-800 outline-none read-only:cursor-default"
        />
      )}
    </div>
  ) : null;

  return (
    <label className="flex flex-col">
      <span className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-zinc-500">
        {label}
        {collaboratorHere ? (
          <span className="ml-2 font-normal normal-case text-indigo-600">
            · Someone is editing
          </span>
        ) : null}
      </span>
      {joined ? (
        <div className="flex flex-col overflow-hidden rounded-lg border border-rose-200/90 bg-rose-50 divide-y divide-zinc-200/80">
          {multiline ? (
            <textarea
              value={value}
              onChange={(e) => onChange(e.target.value)}
              onFocus={onFocus}
              onBlur={onBlur}
              disabled={disabled}
              rows={textareaRows}
              className={controlClass}
            />
          ) : (
            <input
              value={value}
              onChange={(e) => onChange(e.target.value)}
              onFocus={onFocus}
              onBlur={onBlur}
              disabled={disabled}
              className={controlClass}
            />
          )}
          {suggestionBlock}
        </div>
      ) : multiline ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={onFocus}
          onBlur={onBlur}
          disabled={disabled}
          rows={textareaRows}
          className={controlClass}
        />
      ) : (
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={onFocus}
          onBlur={onBlur}
          disabled={disabled}
          className={controlClass}
        />
      )}
    </label>
  );
}
