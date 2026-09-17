"use client";

import {
  ClientSideSuspense,
  useCreateFeed,
  useSelf,
} from "@liveblocks/react/suspense";
import { CircleAlertIcon, EyeIcon, SparklesIcon, XIcon } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useCanWrite } from "@/app/providers";
import { useDefaultBranch } from "@/components/branch-select";
import { Composer } from "@/components/composer";
import { HelpButton } from "@/components/help-button";
import { useModels } from "@/components/model-select";
import { PresenceAvatars } from "@/components/presence-avatars";
import { DEFAULT_REF, LOCKED_REPO, type Repo } from "@/lib/repo";
import { useSendMessage } from "@/lib/use-send-message";

const REPO_SUGGESTIONS = [
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

// Without a repository the agent can still research and write documents
const DOCUMENT_SUGGESTIONS = [
  {
    label: "Draft a project plan",
    content:
      "Write a project plan document for adding realtime collaboration to an existing web app: phases, milestones, risks, and open questions.",
  },
  {
    label: "Compare two approaches",
    content:
      "Write a document comparing server-side rendering with client-side rendering for a data-heavy dashboard, ending with a recommendation.",
  },
  {
    label: "Write a launch checklist",
    content:
      "Write a launch checklist document for shipping a new SaaS feature, grouped by engineering, QA, marketing, and support.",
  },
];

/**
 * Empty state for a chat that doesn't exist yet. The id comes from the URL;
 * sending the first message creates the feed with it, and the parent swaps
 * to the conversation in place.
 */
export function NewChat({
  feedId,
  error,
  onError: setError,
}: {
  feedId: string;
  error: string | null;
  onError: (error: string | null) => void;
}) {
  const self = useSelf();
  const createFeed = useCreateFeed();
  const sendMessage = useSendMessage();
  const models = useModels();
  const canWrite = useCanWrite();
  const [model, setModel] = useState<string | null>(null);
  // No repository by default: the agent can chat and write documents
  // without one, but needs one to open pull requests.
  const [repo, setRepo] = useState<Repo | null>(LOCKED_REPO);
  const creatingRef = useRef(false);

  useEffect(() => {
    if (models && model === null) {
      setModel(models.defaultModelId);
    }
  }, [model, models]);

  // A newly picked repository starts on its default branch once GitHub has
  // told us what that is, unless a branch was chosen explicitly.
  const branchChosenRef = useRef(false);
  const handleRepoChange = useCallback((next: Repo | null) => {
    setRepo((current) => {
      // Same repository, different ref: that's the branch dropdown
      branchChosenRef.current = next !== null && current?.url === next.url;
      return next;
    });
  }, []);
  const defaultBranch = useDefaultBranch(
    LOCKED_REPO === null && repo ? repo.url : null
  );
  useEffect(() => {
    if (
      repo &&
      defaultBranch &&
      !branchChosenRef.current &&
      repo.ref !== defaultBranch
    ) {
      setRepo({ ...repo, ref: defaultBranch });
    }
  }, [defaultBranch, repo]);

  const handleSend = useCallback(
    async (content: string) => {
      if (creatingRef.current) {
        return;
      }
      setError(null);
      creatingRef.current = true;

      try {
        await createFeed(feedId, {
          metadata: {
            type: "chat",
            title: "",
            createdBy: self.id,
            ...(repo ? { repoUrl: repo.url, repoRef: repo.ref } : {}),
            model: model ?? models?.defaultModelId ?? "composer-2.5",
            agentStatus: "idle",
            participantIds: [self.id],
            pinned: "false",
          },
        });

        await sendMessage(feedId, content);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong.");
        // Rethrow so the composer restores the draft.
        throw err;
      } finally {
        creatingRef.current = false;
      }
    },
    [createFeed, feedId, model, models, repo, self.id, sendMessage, setError]
  );

  const suggestions = repo ? REPO_SUGGESTIONS : DOCUMENT_SUGGESTIONS;

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
              Everyone on the team can join the chat. The agent finishes the
              current task before picking up follow-ups, then replies once.
            </p>
          </div>

          {!canWrite ? (
            <div className="flex items-start gap-2 rounded-lg border border-border bg-panel px-3 py-2.5 text-xs text-muted">
              <EyeIcon className="mt-0.5 size-3.5 shrink-0" />
              <span>
                You have read-only access. Pick a chat from the sidebar to watch
                the team work with the agent in realtime.
              </span>
            </div>
          ) : (
            <>
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
                  typingKey={feedId}
                  placeholder={
                    repo
                      ? "Describe a change, or type / to pick a skill…"
                      : "Ask a question or describe a document to write…"
                  }
                  repo={repo}
                  onRepoChange={handleRepoChange}
                  model={model ?? models?.defaultModelId ?? "…"}
                  onModelChange={setModel}
                  onSend={handleSend}
                />
              </ClientSideSuspense>

              <div className="mt-2 flex flex-wrap justify-center gap-2">
                {suggestions.map((suggestion) => (
                  <button
                    key={suggestion.label}
                    type="button"
                    // Errors are already surfaced via `setError`.
                    onClick={() =>
                      handleSend(suggestion.content).catch(() => {})
                    }
                    className="rounded-full border border-border px-3 py-1 text-xs text-muted transition hover:bg-panel-hover hover:text-foreground"
                  >
                    {suggestion.label}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
