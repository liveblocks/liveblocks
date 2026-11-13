"use client";

import {
  useCreateFeedMessage,
  useDeleteFeedMessage,
  useFeeds,
  useSelf,
  useUpdateFeedMessage,
  useUpdateFeedMetadata,
  useUpdateMyPresence,
} from "@liveblocks/react/suspense";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getUsers } from "@/app/database";
import type { ReplyRequest, ReplyResponse } from "@/lib/api";
import { restoreFailedReply } from "@/lib/drafts";
import { useDemoSeed } from "@/hooks/use-demo-seed";
import { useInboxSettings } from "@/hooks/use-inbox-settings";
import {
  extractMentionedUserIds,
  isOpen,
  previewOf,
  PRIORITY_RANK,
  type Conversation,
  type ConversationMetadata,
  type EmailMessageData,
  type Priority,
  type Status,
} from "@/lib/conversation";
import { cn } from "@/lib/utils";
import {
  ConversationList,
  defaultFilter,
  matchesFilter,
  type ListFilter,
  type ListSort,
} from "./conversation-list";
import { ConversationView, NoConversation } from "./conversation-view";
import { CustomerPanel } from "./customer-panel";
import { SettingsView } from "./settings-view";
import { Sidebar, VIEWS, type View, type ViewCounts } from "./sidebar";
import type { Workspace, WorkspaceId } from "@/lib/workspaces";
import { TooltipProvider } from "./ui/tooltip";

/**
 * The shared inbox. One Liveblocks room per inbox; each conversation is a
 * feed in that room, so the list, the thread, and every status change stay in
 * sync for the whole team in realtime.
 */
export function SupportInbox({
  roomId,
  workspace,
  onWorkspaceChange,
}: {
  roomId: string;
  workspace: Workspace;
  onWorkspaceChange: (workspaceId: WorkspaceId) => void;
}) {
  const self = useSelf();
  const settings = useInboxSettings();
  // Only the default workspace can be connected to a Resend inbox. Until it
  // is (and in every other workspace), every reply is simulated.
  const connected = settings?.mode === "resend" && workspace.connectable;
  const demoMode = !connected;
  const inboxAddress = connected
    ? (settings?.inboxAddress ?? workspace.address)
    : workspace.address;

  // Every conversation in the inbox. Pages are loaded until we have them all
  // so counts and filters are accurate.
  const { feeds, hasFetchedAll, fetchMore, isFetchingMore } = useFeeds({
    limit: 100,
  });
  useEffect(() => {
    if (!hasFetchedAll && !isFetchingMore) {
      fetchMore();
    }
  }, [hasFetchedAll, isFetchingMore, fetchMore]);

  // Sample conversations are only seeded into inboxes that aren't connected
  // to Resend, once we know which mode this deployment runs in.
  const { isSeeding } = useDemoSeed({
    workspace,
    enabled: settings !== null && !connected,
    isLoaded: hasFetchedAll,
    isEmpty: feeds.length === 0,
  });
  // Empty + settings still loading: don't flash "Inbox zero" before seeding.
  const isPreparing = isSeeding || (settings === null && feeds.length === 0);

  const updateFeedMetadata = useUpdateFeedMetadata();
  const createFeedMessage = useCreateFeedMessage();
  const updateFeedMessage = useUpdateFeedMessage();
  const deleteFeedMessage = useDeleteFeedMessage();
  const updateMyPresence = useUpdateMyPresence();

  const [view, setView] = useState<View>("inbox");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<ListFilter>(defaultFilter("inbox"));
  const [sort, setSort] = useState<ListSort>("newest");
  const [detailsOpen, setDetailsOpen] = useState(true);

  const conversations = feeds;
  // Latest feeds for async callbacks that outlive a render (reply delivery).
  const feedsRef = useRef(feeds);
  feedsRef.current = feeds;

  // Feed metadata is written as a whole object: merge each change onto the
  // latest known metadata so no field is dropped.
  const patch = useCallback(
    (conversation: Conversation, changes: Partial<ConversationMetadata>) =>
      updateFeedMetadata(conversation.feedId, {
        ...conversation.metadata,
        ...changes,
      }),
    [updateFeedMetadata]
  );

  const counts = useMemo<ViewCounts>(() => {
    const result: ViewCounts = {
      inbox: 0,
      mine: 0,
      unassigned: 0,
      mentions: 0,
      resolved: 0,
    };
    // Each count is what the view shows with its default filter.
    for (const { metadata } of conversations) {
      for (const { id } of VIEWS) {
        if (
          matchesView(metadata, id, self.id) &&
          matchesFilter(metadata, defaultFilter(id))
        ) {
          result[id] += 1;
        }
      }
    }
    return result;
  }, [conversations, self.id]);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const list = conversations.filter(({ metadata }) => {
      if (!matchesView(metadata, view, self.id)) return false;
      if (!matchesFilter(metadata, filter)) return false;
      if (needle) {
        const haystack = [
          metadata.subject,
          metadata.customerName,
          metadata.customerEmail,
          metadata.customerCompany,
          metadata.preview,
        ]
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(needle)) return false;
      }
      return true;
    });

    const activity = (conversation: Conversation) =>
      Date.parse(conversation.metadata.lastActivityAt) ||
      conversation.updatedAt;

    return list.sort((a, b) => {
      if (sort === "priority") {
        const rank =
          PRIORITY_RANK[a.metadata.priority] - PRIORITY_RANK[b.metadata.priority];
        if (rank !== 0) return rank;
      }
      return sort === "oldest"
        ? activity(a) - activity(b)
        : activity(b) - activity(a);
    });
  }, [conversations, view, filter, query, sort, self.id]);

  const selected = useMemo(
    () => conversations.find((item) => item.feedId === selectedId) ?? null,
    [conversations, selectedId]
  );

  // On wide screens, land on the first conversation of the view so the
  // thread pane is never empty. Phones start on the list instead.
  useEffect(() => {
    if (view === "settings" || selected || visible.length === 0) return;
    if (window.matchMedia("(min-width: 768px)").matches) {
      setSelectedId(visible[0].feedId);
    }
  }, [view, selected, visible]);

  // Drop the selection if the conversation disappeared from the inbox.
  useEffect(() => {
    if (selectedId && hasFetchedAll && !selected) {
      setSelectedId(null);
    }
  }, [selectedId, selected, hasFetchedAll]);

  // Tell teammates which conversation we're reading (live avatars).
  useEffect(() => {
    updateMyPresence({
      viewingFeedId: view === "settings" ? null : selectedId,
    });
  }, [selectedId, view, updateMyPresence]);

  const select = useCallback((feedId: string) => {
    setSelectedId(feedId);
  }, []);

  const changeView = useCallback((next: View) => {
    setView(next);
    setQuery("");
    setFilter(defaultFilter(next));
    if (next === "settings") {
      setSelectedId(null);
    }
  }, []);

  const setStatus = useCallback(
    (status: Status) => {
      if (!selected) return;
      void patch(selected, {
        status,
        lastActivityAt: new Date().toISOString(),
      });
    },
    [selected, patch]
  );

  const setPriority = useCallback(
    (priority: Priority) => {
      if (!selected) return;
      void patch(selected, { priority });
    },
    [selected, patch]
  );

  const setAssignee = useCallback(
    (assigneeId: string) => {
      if (!selected) return;
      void patch(selected, { assigneeId });
    },
    [selected, patch]
  );

  // Hands a reply that's already in the feed to the server, which emails it
  // through Resend and settles the message as "sent". We apply the outcome
  // from the response as well, so the thread updates the instant the request
  // returns rather than waiting on the server's own feed write. If sending
  // fails, the pending message is removed and the text goes back into the
  // agent's composer with the reason.
  const deliver = useCallback(
    async (
      feedId: string,
      messageId: string,
      data: EmailMessageData,
      // List summary as it was before this reply, to put back on failure.
      previous: Pick<
        ConversationMetadata,
        "preview" | "lastActivityAt" | "status"
      >
    ) => {
      const body: ReplyRequest = {
        roomId,
        feedId,
        messageId,
        userId: self.id,
        text: data.text,
      };
      let result: ReplyResponse | null = null;
      try {
        const response = await fetch("/api/conversations/reply", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        result = (await response.json().catch(() => null)) as ReplyResponse | null;
      } catch {
        result = null;
      }

      if (result?.ok) {
        await updateFeedMessage(feedId, messageId, {
          ...data,
          status: "sent",
          resendEmailId: result.resendEmailId,
          from: result.from,
          simulated: result.simulated,
        });
        return;
      }

      const reason =
        (result && !result.ok && result.error) || "Couldn't reach the server.";
      try {
        await deleteFeedMessage(feedId, messageId);
      } catch {
        // The server may already have removed it.
      }
      // Undo the list summary, unless something newer has happened since.
      const current = feedsRef.current.find((feed) => feed.feedId === feedId);
      if (current && current.metadata.preview === previewOf(data.text)) {
        void patch(current, previous);
      }
      restoreFailedReply(feedId, data.text, `Reply not sent — ${reason}`);
    },
    [roomId, self.id, updateFeedMessage, deleteFeedMessage, patch]
  );

  // Sending a reply writes it into the feed right away as a "sending" email,
  // so it shows up for every agent (and in the list) instantly; the server
  // then flips it to "sent" once Resend accepts it.
  const sendReply = useCallback(
    async (text: string) => {
      if (!selected) return;
      const messageId = `reply_${crypto.randomUUID()}`;
      const simulated = demoMode || selected.metadata.source === "demo";
      const data: EmailMessageData = {
        kind: "email",
        direction: "outbound",
        status: "sending",
        resendEmailId: "",
        from: {
          name: self.info.name,
          email: inboxAddress,
        },
        to: [selected.metadata.customerEmail],
        cc: [],
        subject: selected.metadata.subject,
        text,
        attachments: [],
        authorId: self.id,
        simulated,
      };
      const previous = {
        preview: selected.metadata.preview,
        lastActivityAt: selected.metadata.lastActivityAt,
        status: selected.metadata.status,
      };
      await createFeedMessage(selected.feedId, data, { id: messageId });
      // Replying hands the conversation over to the customer.
      void patch(selected, {
        preview: previewOf(text),
        lastActivityAt: new Date().toISOString(),
        status: isOpen(previous.status) ? "waiting" : previous.status,
      });
      void deliver(selected.feedId, messageId, data, previous);
    },
    [
      selected,
      self.id,
      self.info.name,
      demoMode,
      settings,
      createFeedMessage,
      patch,
      deliver,
    ]
  );

  // Internal notes never leave Liveblocks: they're written straight into the
  // feed from the client and are only visible to the team.
  const addNote = useCallback(
    async (text: string) => {
      if (!selected) return;
      const agents = getUsers().map((user) => ({
        id: user.id,
        name: user.info.name,
      }));
      const mentionedUserIds = extractMentionedUserIds(text, agents);
      await createFeedMessage(selected.feedId, {
        kind: "note",
        authorId: self.id,
        text,
        mentionedUserIds,
      });
      await patch(selected, {
        lastActivityAt: new Date().toISOString(),
        mentionedUserIds: [
          ...new Set([
            ...(selected.metadata.mentionedUserIds ?? []),
            ...mentionedUserIds,
          ]),
        ],
      });
    },
    [selected, self.id, createFeedMessage, patch]
  );

  const showingDetail = view !== "settings" && selected !== null;

  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex h-dvh overflow-hidden bg-canvas text-ink md:gap-2.5 md:p-2.5">
        <Sidebar
          view={view}
          counts={counts}
          workspace={workspace}
          inboxAddress={inboxAddress}
          onChange={changeView}
          onWorkspaceChange={onWorkspaceChange}
          className="hidden md:flex"
        />

        {view === "settings" ? (
          <SettingsView
            settings={settings}
            workspace={workspace}
            connected={connected}
          />
        ) : (
          <>
            <ConversationList
              view={view}
              counts={counts}
              conversations={visible}
              selectedId={selectedId}
              query={query}
              filter={filter}
              sort={sort}
              isSeeding={isPreparing}
              inboxAddress={connected ? inboxAddress : null}
              onSelect={select}
              onQueryChange={setQuery}
              onFilterChange={setFilter}
              onSortChange={setSort}
              onViewChange={changeView}
              // Phones show either the list or the thread.
              className={cn(showingDetail ? "hidden md:flex" : "flex")}
            />

            {selected ? (
              <ConversationView
                conversation={selected}
                selfId={self.id}
                demoMode={demoMode}
                detailsOpen={detailsOpen}
                onToggleDetails={() => setDetailsOpen((open) => !open)}
                onBack={() => setSelectedId(null)}
                onSetStatus={setStatus}
                onSetPriority={setPriority}
                onSetAssignee={setAssignee}
                onSendReply={sendReply}
                onAddNote={addNote}
              />
            ) : (
              <NoConversation className="hidden md:flex" />
            )}

            {selected && detailsOpen ? (
              <CustomerPanel
                conversation={selected}
                conversations={conversations}
                onClose={() => setDetailsOpen(false)}
                className="hidden xl:flex"
              />
            ) : null}
          </>
        )}
      </div>
    </TooltipProvider>
  );
}

function matchesView(
  metadata: Conversation["metadata"],
  view: View,
  selfId: string
) {
  switch (view) {
    case "inbox":
      return isOpen(metadata.status);
    case "mine":
      return isOpen(metadata.status) && metadata.assigneeId === selfId;
    case "unassigned":
      return isOpen(metadata.status) && !metadata.assigneeId;
    case "resolved":
      return metadata.status === "resolved";
    case "mentions":
      return metadata.mentionedUserIds?.includes(selfId) ?? false;
    case "settings":
      return false;
  }
}
