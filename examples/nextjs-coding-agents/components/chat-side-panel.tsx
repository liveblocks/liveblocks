"use client";

import { useStorage } from "@liveblocks/react/suspense";
import { FileDiffIcon, FileTextIcon, GitPullRequestIcon } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChangesView } from "@/components/changes-panel";
import { DocumentView } from "@/components/document-view";
import { PullRequestView } from "@/components/pull-request-view";
import {
  SidePanel,
  SidePanelContext,
  useSidePanelCollapsed,
  type SidePanelTab,
} from "@/components/side-panel";
import type { ChatFeed } from "@/lib/types";

export const DESCRIPTION_TAB = "description";
export const CHANGES_TAB = "changes";
const NO_DOCUMENTS = {};

/**
 * Tabs for the chat's side panel: the pull request's description once one
 * is open, the code changes when the agent has pushed any, and one tab per
 * document it wrote. Documents come straight from Storage, so a new one
 * shows up for everyone the moment the workflow saves it, and it's brought
 * to the front. Description comes first in the strip, but Changes is what
 * opens by default.
 */
export function useChatSidePanel(feed: ChatFeed) {
  const { feedId, metadata } = feed;
  const hasChanges = Boolean(metadata.diffUpdatedAt || metadata.branch);
  const hasPullRequest = Boolean(metadata.prUrl);

  // The map is read as a plain object whose identity only changes when a
  // document does, so deriving from it is cheap. It's missing in rooms from
  // before documents existed, until someone with write access connects and
  // `initialStorage` fills it in.
  const allDocuments = useStorage((root) => root.documents ?? NO_DOCUMENTS);
  const documents = useMemo(
    () =>
      Object.entries(allDocuments)
        .filter(([, document]) => document.feedId === feedId)
        .sort(([, a], [, b]) => a.createdAt.localeCompare(b.createdAt))
        .map(([key, document]) => ({ key, title: document.title })),
    [allDocuments, feedId]
  );

  const tabs = useMemo<SidePanelTab[]>(
    () => [
      ...(hasPullRequest
        ? [
            {
              id: DESCRIPTION_TAB,
              label: "Description",
              icon: <GitPullRequestIcon className="size-4" />,
            },
          ]
        : []),
      ...(hasChanges
        ? [
            {
              id: CHANGES_TAB,
              label: "Changes",
              icon: <FileDiffIcon className="size-4" />,
            },
          ]
        : []),
      ...documents.map((document) => ({
        id: document.key,
        label: document.title,
        icon: <FileTextIcon className="size-4" />,
      })),
    ],
    [documents, hasChanges, hasPullRequest]
  );

  const [collapsed, setCollapsed] = useSidePanelCollapsed();
  const [selected, setSelected] = useState<string | null>(null);

  // Bring a newly created document to the front; on first render, prefer
  // the newest document over the changes tab.
  const knownKeysRef = useRef<Set<string> | null>(null);
  useEffect(() => {
    const keys = new Set(documents.map((document) => document.key));
    const known = knownKeysRef.current;
    knownKeysRef.current = keys;
    if (known === null) {
      return;
    }
    const added = documents.find((document) => !known.has(document.key));
    if (added) {
      setSelected(added.key);
    }
  }, [documents]);

  const activeTab =
    selected && tabs.some((tab) => tab.id === selected)
      ? selected
      : (tabs[tabs.length - 1]?.id ?? null);

  // Bumped when something outside the panel opens a tab while the panel is
  // already unfolded, so it can flash: nothing else may visibly change.
  // Unfolding the panel is feedback enough on its own.
  const [highlight, setHighlight] = useState(0);

  const open = useCallback(
    (tabId: string) => {
      setSelected(tabId);
      if (collapsed) {
        setCollapsed(false);
      } else {
        setHighlight((value) => value + 1);
      }
    },
    [collapsed, setCollapsed]
  );

  return {
    tabs,
    activeTab,
    setActiveTab: setSelected,
    collapsed,
    setCollapsed,
    highlight,
    context: useMemo(() => ({ open }), [open]),
  };
}

export function ChatSidePanel({
  feed,
  roomId,
  panel,
}: {
  feed: ChatFeed;
  roomId: string;
  panel: ReturnType<typeof useChatSidePanel>;
}) {
  const { feedId, metadata } = feed;
  const { tabs, activeTab, setActiveTab, collapsed, setCollapsed, highlight } =
    panel;

  if (tabs.length === 0 || activeTab === null) {
    return null;
  }

  return (
    <SidePanel
      tabs={tabs}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      collapsed={collapsed}
      onCollapsedChange={setCollapsed}
      highlight={highlight}
    >
      {activeTab === DESCRIPTION_TAB && metadata.prUrl ? (
        <PullRequestView
          prUrl={metadata.prUrl}
          refreshKey={metadata.diffUpdatedAt ?? ""}
        />
      ) : activeTab === CHANGES_TAB ? (
        <ChangesView
          roomId={roomId}
          feedId={feedId}
          repoUrl={metadata.repoUrl}
          branch={metadata.branch}
          prUrl={metadata.prUrl}
          // Refetch once a run finishes and saves a new diff
          refreshKey={metadata.diffUpdatedAt ?? metadata.branch ?? ""}
        />
      ) : (
        <DocumentView key={activeTab} documentKey={activeTab} />
      )}
    </SidePanel>
  );
}

export { SidePanelContext };
