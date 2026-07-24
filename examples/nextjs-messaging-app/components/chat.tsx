"use client";

import { useEffect, useRef } from "react";
import { useCreateFeed, useRoom } from "@liveblocks/react/suspense";
import type { Channel } from "@/lib/workspaces";
import { Composer } from "@/components/composer";
import { MessageList } from "@/components/message-list";
import { PresenceAvatars } from "@/components/presence-avatars";
import { TypingIndicator } from "@/components/typing-indicator";

export function Chat({ channel }: { channel: Channel }) {
  const createFeed = useCreateFeed();
  const room = useRoom();
  const ensuredFeedsRef = useRef(new Set<string>());

  useEffect(() => {
    if (ensuredFeedsRef.current.has(channel.id)) {
      return;
    }

    ensuredFeedsRef.current.add(channel.id);

    const ensureFeed = async () => {
      try {
        await createFeed(channel.id, {
          metadata: { name: channel.name },
        });
      } catch {
        // Feed already exists.
      }
    };

    void ensureFeed();
  }, [channel.id, channel.name, createFeed]);

  return (
    <div className="flex h-full min-h-0 flex-col bg-white">
      <header className="flex shrink-0 items-center gap-3 border-b border-neutral-200 px-4 py-3">
        <div className="min-w-0">
          <h2 className="truncate text-lg font-bold text-neutral-900">
            #{channel.name}
          </h2>
        </div>
        <PresenceAvatars />
      </header>

      <MessageList channelId={channel.id} channelName={channel.name} />
      <TypingIndicator channelId={channel.id} />
      <Composer channel={channel} roomId={room.id} />
    </div>
  );
}
