"use client";

import { runIssueButtonAi } from "@/actions/liveblocks";
import { AI_USER_INFO } from "@/database";
import { SparklesIcon } from "@/icons/SparklesIcon";
import { SpinnerIcon } from "@/icons/SpinnerIcon";
import type { AiIssueButtonKind } from "@/lib/ai-issue-button-prompts";
import { useFeedMessages, useSelf } from "@liveblocks/react";
import { useCallback, useEffect, useRef, useState } from "react";

const titles: Record<AiIssueButtonKind, string> = {
  links: "Find and add relevant links",
  properties: "Fill missing properties",
  labels: "Fill missing labels",
};

function ButtonFeedCompleteWatcher({
  feedId,
  onComplete,
}: {
  feedId: string;
  onComplete: () => void;
}) {
  const { messages } = useFeedMessages(feedId);

  useEffect(() => {
    const last = messages?.at(-1);
    if (last?.data.stage === "complete") {
      onComplete();
    }
  }, [messages, onComplete]);

  return null;
}

export function IssueAiButton({
  kind,
  issueId,
}: {
  kind: AiIssueButtonKind;
  issueId: string;
}) {
  const self = useSelf();
  const [isCalling, setIsCalling] = useState(false);
  const [activeFeedId, setActiveFeedId] = useState<string | null>(null);
  const blockRef = useRef(false);

  const canRun = Boolean(self?.id && self.id !== AI_USER_INFO.id);

  const clearActiveFeed = useCallback(() => {
    setActiveFeedId(null);
    blockRef.current = false;
  }, []);

  const onClick = useCallback(async () => {
    if (!canRun || !self?.id || blockRef.current) {
      return;
    }
    blockRef.current = true;
    setIsCalling(true);
    try {
      const res = await runIssueButtonAi(kind, issueId, self.id);
      if (!res.ok) {
        blockRef.current = false;
        return;
      }
      setActiveFeedId(res.feedId);
    } catch {
      blockRef.current = false;
    } finally {
      setIsCalling(false);
    }
  }, [canRun, self?.id, kind, issueId]);

  const showSpinner = isCalling || activeFeedId !== null;

  return (
    <>
      {activeFeedId ? (
        <ButtonFeedCompleteWatcher
          feedId={activeFeedId}
          onComplete={clearActiveFeed}
        />
      ) : null}
      <button
        type="button"
        onClick={onClick}
        disabled={!canRun}
        aria-busy={showSpinner}
        title={titles[kind]}
        className={`shrink-0 rounded p-1 text-indigo-600 transition-colors hover:bg-indigo-50 disabled:pointer-events-none disabled:opacity-40 ${showSpinner ? "pointer-events-none cursor-wait" : ""}`}
      >
        <span className="sr-only">
          {showSpinner ? "Thinking…" : titles[kind]}
        </span>
        {showSpinner ? (
          <SpinnerIcon className="h-3.5 w-3.5 animate-spin text-neutral-400" />
        ) : (
          <SparklesIcon className="h-3.5 w-3.5" />
        )}
      </button>
    </>
  );
}
