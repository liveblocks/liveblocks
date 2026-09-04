"use client";

import {
  ClientSideSuspense,
  useCreateFeed,
  useSelf,
} from "@liveblocks/react/suspense";
import { CircleAlertIcon, LockIcon, SparklesIcon, XIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { nanoid } from "nanoid";
import { useCallback, useEffect, useRef, useState } from "react";
import { Composer } from "@/components/composer";
import { HelpButton } from "@/components/help-button";
import { useModels } from "@/components/model-select";
import { PresenceAvatars } from "@/components/presence-avatars";
import { DEFAULT_REPO, REPO_LOCKED, resolveRepo, type Repo } from "@/lib/repo";
import { useSendMessage } from "@/lib/use-send-message";

const SUGGESTIONS = [
  {
    label: "Explain the repository",
    content:
      "<skill:explain> Walk me through what this repository does and how it's organized.",
  },
  {
    label: "Write tests",
    content:
      "<skill:write-tests> Add tests for the most important untested module.",
  },
  {
    label: "Improve the README",
    content:
      "<skill:update-docs> Improve the README so a new contributor can get set up in five minutes.",
  },
];

export function NewChat() {
  const router = useRouter();
  const self = useSelf();
  const createFeed = useCreateFeed();
  const sendMessage = useSendMessage();
  const models = useModels();
  const [model, setModel] = useState<string | null>(null);
  const [repoInput, setRepoInput] = useState<Repo>(DEFAULT_REPO);
  const [error, setError] = useState<string | null>(null);
  const creatingRef = useRef(false);

  useEffect(() => {
    if (models && model === null) {
      setModel(models.defaultModelId);
    }
  }, [model, models]);

  const handleSend = useCallback(
    async (content: string) => {
      if (creatingRef.current) {
        return;
      }
      setError(null);

      const repo = resolveRepo(repoInput);
      if (!repo) {
        setError(
          "Enter a GitHub repository URL like https://github.com/owner/repo"
        );
        return;
      }

      creatingRef.current = true;
      const feedId = nanoid();

      try {
        await createFeed(feedId, {
          metadata: {
            type: "chat",
            title: "",
            createdBy: self.id,
            repoUrl: repo.url,
            repoRef: repo.ref,
            model: model ?? models?.defaultModelId ?? "composer-2.5",
            agentStatus: "idle",
            participantIds: [self.id],
          },
        });

        router.push(`/chat/${feedId}`);
        await sendMessage(feedId, content);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong.");
      } finally {
        creatingRef.current = false;
      }
    },
    [createFeed, model, models, repoInput, router, self.id, sendMessage]
  );

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="flex h-12 shrink-0 items-center gap-3 border-b border-border px-4">
        <h1 className="min-w-0 flex-1 truncate text-[13px] font-semibold">
          New chat
        </h1>
        <ClientSideSuspense fallback={null}>
          <PresenceAvatars />
        </ClientSideSuspense>
        <HelpButton />
      </header>

      <div className="flex min-h-0 flex-1 flex-col items-center justify-center overflow-y-auto px-6 py-8">
        <div className="w-full max-w-3xl">
          <div className="mb-8 flex flex-col items-center text-center">
            <span className="mb-4 flex size-11 items-center justify-center rounded-xl bg-accent-soft text-accent-foreground">
              <SparklesIcon className="size-5" />
            </span>
            <h2 className="text-xl font-semibold tracking-tight">
              What should the agent work on?
            </h2>
            <p className="mt-1.5 max-w-md text-sm text-muted">
              Everyone in this room can join the chat. The agent finishes the
              current task before picking up follow-ups, then replies once.
            </p>
          </div>

          <RepoField value={repoInput} onChange={setRepoInput} />

          {error ? (
            <div className="mb-2 flex items-start gap-2 rounded-lg border border-danger/30 bg-danger/5 px-3 py-2 text-xs text-danger">
              <CircleAlertIcon className="mt-0.5 size-3.5 shrink-0" />
              <span className="flex-1">{error}</span>
              <button
                type="button"
                onClick={() => setError(null)}
                aria-label="Dismiss"
                className="rounded p-0.5 hover:bg-danger/10"
              >
                <XIcon className="size-3" />
              </button>
            </div>
          ) : null}

          <ClientSideSuspense fallback={null}>
            <Composer
              typingKey="new-chat"
              placeholder="Describe a change, or type / to pick a skill…"
              repo={resolveRepo(repoInput) ?? DEFAULT_REPO}
              model={model ?? models?.defaultModelId ?? "…"}
              onModelChange={setModel}
              onSend={handleSend}
            />
          </ClientSideSuspense>

          <div className="mt-2 flex flex-wrap justify-center gap-2">
            {SUGGESTIONS.map((suggestion) => (
              <button
                key={suggestion.label}
                type="button"
                onClick={() => void handleSend(suggestion.content)}
                className="rounded-full border border-border px-3 py-1 text-xs text-muted transition hover:bg-panel-hover hover:text-foreground"
              >
                {suggestion.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function RepoField({
  value,
  onChange,
}: {
  value: Repo;
  onChange: (repo: Repo) => void;
}) {
  return (
    <div className="mb-3 flex items-center gap-2">
      <label className="flex min-w-0 flex-1 items-center gap-2 rounded-lg border border-border bg-panel px-3 py-1.5 text-xs">
        <span className="shrink-0 text-subtle">Repository</span>
        <input
          type="url"
          value={value.url}
          readOnly={REPO_LOCKED}
          onChange={(event) => onChange({ ...value, url: event.target.value })}
          placeholder="https://github.com/owner/repo"
          className="min-w-0 flex-1 bg-transparent font-mono text-xs text-foreground outline-none read-only:cursor-default"
        />
        {REPO_LOCKED ? (
          <span
            className="flex shrink-0 items-center gap-1 text-subtle"
            title="Locked for this demo. Set REPO_LOCKED to false in lib/repo.ts to allow any repository."
          >
            <LockIcon className="size-3" />
            Locked for this demo
          </span>
        ) : null}
      </label>
      <label className="flex shrink-0 items-center gap-2 rounded-lg border border-border bg-panel px-3 py-1.5 text-xs">
        <span className="text-subtle">Branch</span>
        <input
          type="text"
          value={value.ref}
          readOnly={REPO_LOCKED}
          onChange={(event) => onChange({ ...value, ref: event.target.value })}
          className="w-20 bg-transparent font-mono text-xs text-foreground outline-none read-only:cursor-default"
        />
      </label>
    </div>
  );
}
