import {
  useCreateFeed,
  useCreateFeedMessage,
  useFeedMessages,
  useRoom,
} from "@liveblocks/react";
import { NodeViewProps, NodeViewWrapper } from "@tiptap/react";
import {
  FormEvent,
  KeyboardEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { HtmlVersionData } from "../../types";
import { TabButton } from "./TabButton";

type HtmlVersion = {
  id: string;
  createdAt: number;
  updatedAt: number;
  data: HtmlVersionData;
};

type Tab = "preview" | "code" | "history";

// A generation that hasn't been updated for this long is considered
// stalled (the server updates the feed at least every ~100ms while the
// model streams).
const STALLED_GENERATION_MS = 30_000;

export function HtmlComponentView({
  editor,
  node,
  selected,
  updateAttributes,
}: NodeViewProps) {
  const feedId = typeof node.attrs.feedId === "string" ? node.attrs.feedId : "";

  return (
    <NodeViewWrapper
      className="my-4 rounded-2xl border border-border bg-card shadow-sm"
      contentEditable={false}
    >
      {feedId ? (
        <HtmlComponentCard
          feedId={feedId}
          canAutoFocus={selected && editor.isFocused}
        />
      ) : (
        <div className="flex flex-wrap items-center gap-3 p-6 text-sm text-muted-foreground">
          <span>This HTML component is missing its feed reference.</span>
          <button
            type="button"
            className="rounded-md border border-border bg-background px-2.5 py-1 text-xs font-medium"
            onClick={() =>
              updateAttributes({
                feedId: `html-component-${crypto.randomUUID()}`,
              })
            }
          >
            Reset component
          </button>
        </div>
      )}
    </NodeViewWrapper>
  );
}

function HtmlComponentCard({
  feedId,
  canAutoFocus,
}: {
  feedId: string;
  canAutoFocus: boolean;
}) {
  const room = useRoom();
  const createFeed = useCreateFeed();
  const createFeedMessage = useCreateFeedMessage();
  const {
    messages,
    isLoading,
    error: messagesError,
    fetchMore,
    hasFetchedAll,
    isFetchingMore,
  } = useFeedMessages(feedId);

  // Ensure the feed exists as soon as the component appears in the
  // document, so every client can subscribe to it. Creating an existing
  // feed fails, which is fine to ignore.
  useEffect(() => {
    createFeed(feedId, { metadata: { kind: "html-component" } }).catch(
      () => {}
    );
  }, [createFeed, feedId]);

  // Every feed message is one version of the component, oldest first.
  const versions: HtmlVersion[] = useMemo(
    () =>
      (messages ?? [])
        .slice()
        .sort((a, b) => a.createdAt - b.createdAt)
        .map((message) => ({
          id: message.id,
          createdAt: message.createdAt,
          updatedAt: message.updatedAt,
          data: message.data,
        })),
    [messages]
  );

  const latest = versions.length > 0 ? versions[versions.length - 1] : null;

  // The server updates the generating message continuously; if updates
  // stop arriving (e.g. the serverless function timed out mid-stream),
  // treat the generation as failed instead of locking the UI forever.
  // Staleness is measured from when this client last *observed* an
  // update, so it is immune to client/server clock differences.
  const [now, setNow] = useState(() => Date.now());
  const isMarkedGenerating = latest?.data.status === "generating";
  const lastObservedUpdateRef = useRef(Date.now());

  useEffect(() => {
    lastObservedUpdateRef.current = Date.now();
  }, [latest?.id, latest?.updatedAt]);

  useEffect(() => {
    if (!isMarkedGenerating) {
      return;
    }

    setNow(Date.now());
    const interval = setInterval(() => setNow(Date.now()), 5_000);
    return () => clearInterval(interval);
  }, [isMarkedGenerating]);

  const isStalled =
    isMarkedGenerating &&
    now - lastObservedUpdateRef.current > STALLED_GENERATION_MS;
  const isGenerating = isMarkedGenerating && !isStalled;

  const [tab, setTab] = useState<Tab>("preview");
  // When set, an older version from the history is being viewed.
  const [viewedVersionId, setViewedVersionId] = useState<string | null>(null);
  // Local, unsaved edits to the code.
  const [draft, setDraft] = useState<string | null>(null);
  const [isPromptOpen, setIsPromptOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const viewed =
    (viewedVersionId
      ? versions.find((version) => version.id === viewedVersionId)
      : undefined) ?? latest;

  // While the AI streams, follow the live code; when it finishes, show
  // the rendered result. Unsaved local edits are deliberately kept: a
  // collaborator's generation must not wipe someone else's draft.
  const wasGenerating = useRef(false);
  useEffect(() => {
    if (isGenerating && !wasGenerating.current) {
      setViewedVersionId(null);
      setIsPromptOpen(false);
      if (draft === null) {
        setTab("code");
      }
    } else if (!isGenerating && wasGenerating.current && draft === null) {
      setTab((current) => (current === "code" ? "preview" : current));
    }
    wasGenerating.current = isGenerating;
  }, [isGenerating, draft]);

  async function generate(prompt: string) {
    const trimmedPrompt = prompt.trim();

    if (!trimmedPrompt || isGenerating || isSubmitting) {
      return;
    }

    setSubmitError(null);
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/generate-html", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomId: room.id,
          feedId,
          prompt: trimmedPrompt,
        }),
      });

      if (!response.ok) {
        throw new Error((await response.text()) || "Failed to generate HTML");
      }
    } catch (error) {
      setSubmitError(
        error instanceof Error ? error.message : "Failed to generate HTML"
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function saveDraft() {
    if (draft === null || !viewed) {
      return;
    }

    setSubmitError(null);

    try {
      // Manual edits are appended to the feed as a new version.
      await createFeedMessage(feedId, {
        prompt: viewed.data.prompt,
        html: draft,
        status: "complete",
        source: "edit",
      });
      setDraft(null);
      setViewedVersionId(null);
    } catch (error) {
      setSubmitError(
        error instanceof Error ? error.message : "Failed to save the edit"
      );
    }
  }

  async function restoreVersion(version: HtmlVersion) {
    setSubmitError(null);

    try {
      // Restoring re-appends the old version as the newest one, keeping
      // the full history intact.
      await createFeedMessage(feedId, {
        prompt: version.data.prompt,
        html: version.data.html,
        status: "complete",
        source: "restore",
      });
      setViewedVersionId(null);
      setDraft(null);
      setTab("preview");
    } catch (error) {
      setSubmitError(
        error instanceof Error ? error.message : "Failed to restore version"
      );
    }
  }

  if (isLoading) {
    return (
      <div className="p-6 text-sm text-muted-foreground">
        Loading HTML component…
      </div>
    );
  }

  if (messagesError) {
    return (
      <div className="p-6 text-sm text-destructive">
        Couldn’t load this component’s versions. Reload the page to try again.
      </div>
    );
  }

  // No versions yet: show the create-with-AI prompt.
  if (!latest || !viewed) {
    return (
      <div className="p-4">
        <PromptForm
          autoFocus={canAutoFocus}
          initialValue=""
          placeholder="Describe an interactive HTML component..."
          isSubmitting={isSubmitting}
          onSubmit={generate}
        />
        {submitError ? (
          <p className="mt-3 text-sm text-destructive">{submitError}</p>
        ) : null}
        <div className="mt-3 rounded-xl border border-dashed border-border bg-muted/30 p-6 text-center text-sm text-muted-foreground">
          {isSubmitting
            ? "Starting generation…"
            : "Press Enter to create an interactive HTML box with AI."}
        </div>
      </div>
    );
  }

  const isViewingOldVersion = viewed.id !== latest.id;

  return (
    <div className="p-3">
      <div className="flex flex-wrap items-center gap-2 pb-3">
        <span className="flex size-8 flex-none items-center justify-center rounded-md border border-border bg-background text-xs font-semibold">
          AI
        </span>
        <span
          className="min-w-0 flex-1 truncate text-sm text-muted-foreground"
          title={viewed.data.prompt}
        >
          {viewed.data.prompt || "HTML component"}
        </span>

        <div className="flex items-center gap-1 rounded-lg border border-border bg-background p-0.5">
          <TabButton
            label="Preview"
            active={tab === "preview"}
            onClick={() => setTab("preview")}
          />
          <TabButton
            label="Code"
            active={tab === "code"}
            onClick={() => setTab("code")}
          />
          <TabButton
            label={`History (${versions.length}${hasFetchedAll === false ? "+" : ""})`}
            active={tab === "history"}
            onClick={() => setTab("history")}
          />
        </div>

        <button
          type="button"
          className="rounded-md border border-border bg-background px-2.5 py-1.5 text-xs font-medium disabled:cursor-not-allowed disabled:opacity-50"
          disabled={isGenerating}
          onClick={() => setIsPromptOpen((open) => !open)}
        >
          New prompt
        </button>
      </div>

      {isPromptOpen && !isGenerating ? (
        <div className="pb-3">
          <PromptForm
            autoFocus
            initialValue={latest.data.prompt}
            placeholder="Describe what to generate next..."
            isSubmitting={isSubmitting}
            onSubmit={generate}
            onCancel={() => setIsPromptOpen(false)}
          />
        </div>
      ) : null}

      {isGenerating ? (
        <p className="pb-3 text-sm text-muted-foreground">
          Generating… the code below streams in for everyone in the room.
        </p>
      ) : null}

      {isStalled ? (
        <p className="pb-3 text-sm text-destructive">
          The last generation stalled and never finished. Try a new prompt.
        </p>
      ) : null}

      {latest.data.status === "error" ? (
        <p className="pb-3 text-sm text-destructive">
          {latest.data.error ?? "The last generation failed."}
        </p>
      ) : null}

      {submitError ? (
        <p className="pb-3 text-sm text-destructive">{submitError}</p>
      ) : null}

      {isViewingOldVersion ? (
        <div className="mb-3 flex flex-wrap items-center gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2 text-xs">
          <span className="text-muted-foreground">
            Viewing an older version.
          </span>
          <button
            type="button"
            className="rounded-md border border-border bg-background px-2 py-1 font-medium"
            onClick={() => restoreVersion(viewed)}
          >
            Restore this version
          </button>
          <button
            type="button"
            className="rounded-md border border-border bg-background px-2 py-1 font-medium"
            onClick={() => {
              setViewedVersionId(null);
              setDraft(null);
            }}
          >
            Back to latest
          </button>
        </div>
      ) : null}

      {tab === "preview" ? (
        <HtmlPreview
          html={draft ?? viewed.data.html}
          label={viewed.data.prompt || "Generated HTML"}
        />
      ) : null}

      {tab === "code" ? (
        <CodeEditor
          code={draft ?? viewed.data.html}
          streaming={isGenerating && !isViewingOldVersion && draft === null}
          readOnly={isGenerating}
          onChange={(code) => setDraft(code)}
          onSave={draft !== null && !isGenerating ? saveDraft : undefined}
          onDiscard={draft !== null ? () => setDraft(null) : undefined}
        />
      ) : null}

      {tab === "history" ? (
        <VersionHistory
          versions={versions}
          viewedId={viewed.id}
          latestId={latest.id}
          hasFetchedAll={hasFetchedAll ?? true}
          isFetchingMore={isFetchingMore ?? false}
          onFetchMore={fetchMore}
          onView={(version) => {
            setViewedVersionId(version.id === latest.id ? null : version.id);
            setDraft(null);
            setTab("preview");
          }}
          onRestore={restoreVersion}
        />
      ) : null}
    </div>
  );
}

function PromptForm({
  autoFocus,
  initialValue,
  placeholder,
  isSubmitting,
  onSubmit,
  onCancel,
}: {
  autoFocus: boolean;
  initialValue: string;
  placeholder: string;
  isSubmitting: boolean;
  onSubmit: (prompt: string) => void;
  onCancel?: () => void;
}) {
  const [value, setValue] = useState(initialValue);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (autoFocus) {
      inputRef.current?.focus();
    }
  }, [autoFocus]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSubmit(value);
    onCancel?.();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    event.stopPropagation();

    if (event.key === "Escape") {
      onCancel?.();
    }
  }

  return (
    <form
      className="flex items-center gap-3 rounded-xl border border-border bg-background px-4 py-3"
      onSubmit={handleSubmit}
    >
      <SparklesIcon />
      <input
        ref={inputRef}
        className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        placeholder={placeholder}
        value={value}
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={handleKeyDown}
      />
      <button
        type="submit"
        className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50"
        disabled={!value.trim() || isSubmitting}
      >
        {isSubmitting ? "Generating…" : "Generate"}
      </button>
      {onCancel ? (
        <button
          type="button"
          className="rounded-md border border-border px-3 py-1.5 text-sm font-medium text-muted-foreground"
          onClick={onCancel}
        >
          Cancel
        </button>
      ) : null}
    </form>
  );
}

function CodeEditor({
  code,
  streaming,
  readOnly,
  onChange,
  onSave,
  onDiscard,
}: {
  code: string;
  streaming: boolean;
  readOnly: boolean;
  onChange: (code: string) => void;
  onSave?: () => void;
  onDiscard?: () => void;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Follow the stream while the AI writes code.
  useEffect(() => {
    if (streaming && textareaRef.current) {
      textareaRef.current.scrollTop = textareaRef.current.scrollHeight;
    }
  }, [streaming, code]);

  return (
    <div>
      <textarea
        ref={textareaRef}
        className="h-[360px] w-full resize-none rounded-xl border border-border bg-zinc-950 p-4 font-mono text-xs leading-relaxed text-zinc-100 outline-none"
        spellCheck={false}
        value={code}
        readOnly={readOnly}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => event.stopPropagation()}
      />
      {onSave || onDiscard ? (
        <div className="mt-2 flex items-center gap-2">
          {onSave ? (
            <button
              type="button"
              className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground"
              onClick={onSave}
            >
              Save as new version
            </button>
          ) : null}
          {onDiscard ? (
            <button
              type="button"
              className="rounded-md border border-border px-3 py-1.5 text-sm font-medium text-muted-foreground"
              onClick={onDiscard}
            >
              Discard changes
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function VersionHistory({
  versions,
  viewedId,
  latestId,
  hasFetchedAll,
  isFetchingMore,
  onFetchMore,
  onView,
  onRestore,
}: {
  versions: HtmlVersion[];
  viewedId: string;
  latestId: string;
  hasFetchedAll: boolean;
  isFetchingMore: boolean;
  onFetchMore?: () => void;
  onView: (version: HtmlVersion) => void;
  onRestore: (version: HtmlVersion) => void;
}) {
  const newestFirst = versions.slice().reverse();

  return (
    <div className="rounded-xl border border-border">
      {!hasFetchedAll && onFetchMore ? (
        <div className="border-b border-border p-2 text-center">
          <button
            type="button"
            className="rounded-md border border-border bg-background px-2.5 py-1 text-xs font-medium disabled:opacity-50"
            disabled={isFetchingMore}
            onClick={onFetchMore}
          >
            {isFetchingMore ? "Loading…" : "Load earlier versions"}
          </button>
        </div>
      ) : null}
      <ul className="max-h-[360px] divide-y divide-border overflow-y-auto">
        {newestFirst.map((version, index) => (
          <li
            key={version.id}
            className={`flex flex-wrap items-center gap-2 px-3 py-2 text-sm ${
              version.id === viewedId ? "bg-accent/50" : ""
            }`}
          >
            <span className="font-medium">
              v{versions.length - index}
              {version.id === latestId ? " (latest)" : ""}
            </span>
            <SourceBadge
              source={version.data.source}
              status={version.data.status}
              isLatest={version.id === latestId}
            />
            <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
              {version.data.prompt}
            </span>
            <span className="text-xs text-muted-foreground">
              {new Date(version.createdAt).toLocaleString()}
            </span>
            <button
              type="button"
              className="rounded-md border border-border bg-background px-2 py-1 text-xs font-medium"
              onClick={() => onView(version)}
            >
              View
            </button>
            {version.id !== latestId ? (
              <button
                type="button"
                className="rounded-md border border-border bg-background px-2 py-1 text-xs font-medium"
                onClick={() => onRestore(version)}
              >
                Restore
              </button>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}

function SourceBadge({
  source,
  status,
  isLatest,
}: {
  source: HtmlVersionData["source"];
  status: HtmlVersionData["status"];
  isLatest: boolean;
}) {
  const label =
    status === "generating"
      ? // Only the newest message can still be streaming; an older one
        // stuck at "generating" never finished.
        isLatest
        ? "generating"
        : "incomplete"
      : status === "error"
        ? "failed"
        : source === "edit"
          ? "manual edit"
          : source === "restore"
            ? "restored"
            : "AI";

  return (
    <span className="rounded-full border border-border bg-muted/50 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
      {label}
    </span>
  );
}

function HtmlPreview({ html, label }: { html: string; label: string }) {
  return (
    <iframe
      className="h-[360px] w-full rounded-xl border border-border bg-white"
      title={label}
      sandbox="allow-scripts"
      srcDoc={withPreviewCsp(html)}
    />
  );
}

function withPreviewCsp(html: string) {
  const csp =
    "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data:; font-src data:;";
  const meta = `<meta http-equiv="Content-Security-Policy" content="${csp}">`;

  if (/<head(?:\s[^>]*)?>/i.test(html)) {
    return html.replace(/<head(\s[^>]*)?>/i, `<head$1>${meta}`);
  }

  return `<!doctype html><html><head>${meta}</head><body>${html}</body></html>`;
}

function SparklesIcon() {
  return (
    <svg
      className="size-4 flex-none text-muted-foreground"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M12 3l1.9 4.6L18.5 9.5l-4.6 1.9L12 16l-1.9-4.6-4.6-1.9 4.6-1.9z" />
      <path d="M18 15l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8z" />
    </svg>
  );
}
