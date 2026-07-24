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
  useMutation,
  useStorage,
} from "@liveblocks/react/suspense";
import clsx from "clsx";
import {
  GripVerticalIcon,
  PencilIcon,
  PlusIcon,
  Trash2Icon,
} from "lucide-react";
import { nanoid } from "nanoid";
import { useState } from "react";
import type { Channel } from "@/lib/workspaces";

export function ChannelList({
  activeChannelId,
  onSelectChannel,
}: {
  activeChannelId: string | null;
  onSelectChannel: (channelId: string) => void;
}) {
  const channels = useStorage((root) => root.channels);
  const deleteFeed = useDeleteFeed();
  const [creating, setCreating] = useState(false);
  const [newChannelName, setNewChannelName] = useState("");
  const [editingChannelId, setEditingChannelId] = useState<string | null>(
    null
  );
  const [editingName, setEditingName] = useState("");

  const createChannel = useMutation(({ storage }, name: string) => {
    const trimmed = name.trim();
    if (!trimmed) {
      return;
    }

    storage.get("channels").push(
      new LiveObject({
        id: nanoid(),
        name: trimmed,
      })
    );
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

    createChannel(trimmed);
    setNewChannelName("");
    setCreating(false);
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
              className="w-full rounded-md border border-white/20 bg-white/10 px-2 py-1.5 text-sm text-white placeholder:text-white/40 focus:border-white/40 focus:outline-none"
            />
          </div>
        ) : null}
      </div>

      <button
        type="button"
        onClick={() => setCreating(true)}
        className="mt-1 flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm text-[var(--sidebar-text-muted)] transition hover:bg-[var(--sidebar-bg-hover)] hover:text-[var(--sidebar-text)]"
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
  editing: boolean;
  editingName: string;
  onSelect: () => void;
  onEditingNameChange: (name: string) => void;
  onStartRename: () => void;
  onSaveRename: () => void;
  onCancelRename: () => void;
  onDelete: () => void;
}) {
  const {
    attributes,
    isDragging,
    listeners,
    setActivatorNodeRef,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: channel.id });

  return (
    <li
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      className={clsx("group relative", isDragging && "z-10 opacity-70")}
    >
      <div
        className={clsx(
          "flex items-center gap-0.5 rounded-md pr-1 transition",
          active
            ? "bg-[var(--sidebar-bg-active)] text-white"
            : "text-[var(--sidebar-text-muted)] hover:bg-[var(--sidebar-bg-hover)] hover:text-[var(--sidebar-text)]"
        )}
      >
        <button
          type="button"
          ref={setActivatorNodeRef}
          className="cursor-grab px-1 py-2 text-white/30 opacity-0 transition hover:text-white/70 group-hover:opacity-100 active:cursor-grabbing"
          aria-label={`Reorder ${channel.name}`}
          {...attributes}
          {...listeners}
        >
          <GripVerticalIcon className="size-3.5" aria-hidden />
        </button>

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
            className="min-w-0 flex-1 rounded border border-white/20 bg-white/10 px-2 py-1 text-sm text-white focus:border-white/40 focus:outline-none"
          />
        ) : (
          <button
            type="button"
            onClick={onSelect}
            className="min-w-0 flex-1 truncate py-2 pr-1 text-left text-[15px]"
          >
            <span className="opacity-70">#</span>
            {channel.name}
          </button>
        )}

        {!editing ? (
          <div className="flex items-center opacity-0 transition group-hover:opacity-100">
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onStartRename();
              }}
              className="rounded p-1 text-white/50 hover:bg-white/10 hover:text-white"
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
              className="rounded p-1 text-white/50 hover:bg-red-500/20 hover:text-red-200"
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
