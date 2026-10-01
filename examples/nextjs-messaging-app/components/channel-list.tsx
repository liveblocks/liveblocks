"use client";

import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { LiveObject } from "@liveblocks/client";
import {
  useDeleteFeed,
  useFeeds,
  useMutation,
  useStorage,
} from "@liveblocks/react/suspense";
import clsx from "clsx";
import { PencilIcon, PlusIcon, Trash2Icon } from "lucide-react";
import { nanoid } from "nanoid";
import { useMemo, useState } from "react";
import { UnreadBadge } from "@/components/unread-badge";
import { getActivityRootFeedId } from "@/lib/activity";
import { useUnreadActivity } from "@/lib/use-activity";
import type { Channel } from "@/lib/workspaces";

export function ChannelList({
  activeChannelId,
  onSelectChannel,
}: {
  activeChannelId: string | null;
  onSelectChannel: (channelId: string) => void;
}) {
  const channels = useStorage((root) => root.channels);
  const { feeds: threadFeeds } = useFeeds({
    metadata: { type: "thread" },
  });
  const unreadActivity = useUnreadActivity();
  // Channels badge mentions only; plain thread replies stay in Activity.
  const mentionCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const item of unreadActivity) {
      if (item.data.type !== "mention") {
        continue;
      }
      const rootFeedId = getActivityRootFeedId(item);
      counts.set(rootFeedId, (counts.get(rootFeedId) ?? 0) + 1);
    }
    return counts;
  }, [unreadActivity]);
  const deleteFeed = useDeleteFeed();
  const [creating, setCreating] = useState(false);
  const [newChannelName, setNewChannelName] = useState("");
  const [editingChannelId, setEditingChannelId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");

  const createChannel = useMutation(({ storage }, name: string) => {
    const trimmed = name.trim();
    if (!trimmed) {
      return;
    }

    const channelId = nanoid();
    storage.get("channels").push(
      new LiveObject({
        id: channelId,
        name: trimmed,
      })
    );

    return channelId;
  }, []);

  const renameChannel = useMutation(
    ({ storage }, channelId: string, name: string) => {
      const trimmed = name.trim();
      if (!trimmed) {
        return;
      }

      const channelsList = storage.get("channels");
      for (let index = 0; index < channelsList.length; index++) {
        const channel = channelsList.get(index);
        if (channel?.get("id") === channelId) {
          channel.set("name", trimmed);
          return;
        }
      }
    },
    []
  );

  const deleteChannelFromStorage = useMutation(
    ({ storage }, channelId: string) => {
      const channelsList = storage.get("channels");
      for (let index = 0; index < channelsList.length; index++) {
        if (channelsList.get(index)?.get("id") === channelId) {
          channelsList.delete(index);
          return;
        }
      }
    },
    []
  );

  const moveChannel = useMutation(
    ({ storage }, fromIndex: number, toIndex: number) => {
      storage.get("channels").move(fromIndex, toIndex);
    },
    []
  );

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    })
  );

  const handleCreate = () => {
    const trimmed = newChannelName.trim();
    if (!trimmed) {
      return;
    }

    const channelId = createChannel(trimmed);
    if (!channelId) {
      return;
    }

    setNewChannelName("");
    setCreating(false);
    onSelectChannel(channelId);
  };

  const startRename = (channel: Channel) => {
    setEditingChannelId(channel.id);
    setEditingName(channel.name);
  };

  const saveRename = (channelId: string) => {
    const trimmed = editingName.trim();
    if (trimmed) {
      renameChannel(channelId, trimmed);
    }
    setEditingChannelId(null);
    setEditingName("");
  };

  const cancelRename = () => {
    setEditingChannelId(null);
    setEditingName("");
  };

  const handleDelete = async (channelId: string) => {
    for (const threadFeed of threadFeeds) {
      if (threadFeed.metadata.channelId !== channelId) {
        continue;
      }

      try {
        await deleteFeed(threadFeed.feedId);
      } catch {
        // Another participant may already have deleted this thread.
      }
    }

    try {
      await deleteFeed(channelId);
    } catch {
      // Feed may not exist yet if the channel was never opened.
    }

    deleteChannelFromStorage(channelId);
  };

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) {
      return;
    }

    const fromIndex = channels.findIndex((channel) => channel.id === active.id);
    const toIndex = channels.findIndex((channel) => channel.id === over.id);
    if (fromIndex === -1 || toIndex === -1) {
      return;
    }

    moveChannel(fromIndex, toIndex);
  };

  const channelIds = channels.map((channel) => channel.id);

  return (
    <div className="px-2 pb-2">
      <div>
        <DndContext
          collisionDetection={closestCenter}
          sensors={sensors}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={channelIds}
            strategy={verticalListSortingStrategy}
          >
            <ul className="space-y-0.5">
              {channels.map((channel) => (
                <SortableChannelItem
                  key={channel.id}
                  channel={channel}
                  active={channel.id === activeChannelId}
                  unreadCount={mentionCounts.get(channel.id) ?? 0}
                  editing={editingChannelId === channel.id}
                  editingName={editingName}
                  onSelect={() => {
                    if (editingChannelId !== channel.id) {
                      onSelectChannel(channel.id);
                    }
                  }}
                  onEditingNameChange={setEditingName}
                  onStartRename={() => startRename(channel)}
                  onSaveRename={() => saveRename(channel.id)}
                  onCancelRename={cancelRename}
                  onDelete={() => void handleDelete(channel.id)}
                />
              ))}
            </ul>
          </SortableContext>
        </DndContext>

        {creating ? (
          <div className="mt-1 px-1">
            <input
              type="text"
              value={newChannelName}
              onChange={(event) => setNewChannelName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  handleCreate();
                } else if (event.key === "Escape") {
                  setCreating(false);
                  setNewChannelName("");
                }
              }}
              onBlur={() => {
                if (!newChannelName.trim()) {
                  setCreating(false);
                }
              }}
              placeholder="channel-name"
              autoFocus
              className="w-full rounded-md border border-neutral-300 bg-white px-2 py-1.5 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-neutral-400 focus:outline-none"
            />
          </div>
        ) : null}
      </div>

      <button
        type="button"
        onClick={() => setCreating(true)}
        className="h-9 mt-0.5 flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm text-neutral-500 transition hover:bg-neutral-100 hover:text-neutral-900"
      >
        <PlusIcon className="size-4" aria-hidden />
        Add channel
      </button>
    </div>
  );
}

function SortableChannelItem({
  channel,
  active,
  unreadCount,
  editing,
  editingName,
  onSelect,
  onEditingNameChange,
  onStartRename,
  onSaveRename,
  onCancelRename,
  onDelete,
}: {
  channel: Channel;
  active: boolean;
  unreadCount: number;
  editing: boolean;
  editingName: string;
  onSelect: () => void;
  onEditingNameChange: (name: string) => void;
  onStartRename: () => void;
  onSaveRename: () => void;
  onCancelRename: () => void;
  onDelete: () => void;
}) {
  const { attributes, isDragging, listeners, setNodeRef, transform, transition } =
    useSortable({ id: channel.id });

  return (
    <li
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      className={clsx("group relative", isDragging && "z-10 opacity-70")}
    >
      {/* The whole row is the drag handle; the sensor's distance threshold
          keeps plain clicks on the buttons working. Disabled while renaming
          so text selection in the input isn't hijacked. */}
      <div
        className={clsx(
          "flex items-center gap-0.5 rounded-md pl-1 pr-1 transition",
          isDragging && "cursor-grabbing",
          active
            ? "bg-neutral-800 text-white"
            : "text-neutral-700 hover:bg-neutral-100 hover:text-neutral-900"
        )}
        {...(editing ? undefined : listeners)}
      >
        {editing ? (
          <input
            type="text"
            value={editingName}
            onChange={(event) => onEditingNameChange(event.target.value)}
            onBlur={onSaveRename}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                onSaveRename();
              } else if (event.key === "Escape") {
                onCancelRename();
              }
            }}
            onClick={(event) => event.stopPropagation()}
            autoFocus
            className="min-w-0 flex-1 rounded border border-neutral-300 bg-white px-2 py-1 text-sm text-neutral-900 focus:border-neutral-400 focus:outline-none"
          />
        ) : (
          <button
            type="button"
            onClick={onSelect}
            className={clsx(
              "min-w-0 flex-1 truncate py-1.5 pl-1 pr-1 text-left text-sm",
              unreadCount > 0 && !active && "font-semibold text-neutral-900"
            )}
            {...attributes}
          >
            <span className="mr-1.5 text-base leading-none opacity-60">#</span>
            {channel.name}
          </button>
        )}

        {!editing && unreadCount > 0 ? (
          <div className="mr-1 group-hover:hidden">
            <UnreadBadge count={unreadCount} />
          </div>
        ) : null}

        {!editing ? (
          <div className="flex items-center opacity-0 transition group-hover:opacity-100">
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onStartRename();
              }}
              className={clsx(
                "icon-grow rounded p-1 transition-colors",
                active
                  ? "text-white/60 hover:bg-white/15 hover:text-white"
                  : "text-neutral-400 hover:bg-neutral-200 hover:text-neutral-900"
              )}
              aria-label={`Rename ${channel.name}`}
            >
              <PencilIcon className="size-3.5" aria-hidden />
            </button>
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onDelete();
              }}
              className={clsx(
                "icon-grow rounded p-1 transition-colors",
                active
                  ? "text-white/60 hover:bg-red-500/30 hover:text-red-100"
                  : "text-neutral-400 hover:bg-red-50 hover:text-red-600"
              )}
              aria-label={`Delete ${channel.name}`}
            >
              <Trash2Icon className="size-3.5" aria-hidden />
            </button>
          </div>
        ) : null}
      </div>
    </li>
  );
}
