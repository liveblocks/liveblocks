"use client";

import { useEffect, useRef, useState } from "react";
import {
  useCreateFeed,
  useRoom,
  ClientSideSuspense,
} from "@liveblocks/react/suspense";
import type { Channel } from "@/lib/workspaces";
import { ChannelComposer } from "@/components/composer";
import { HelpButton } from "@/components/help-button";
import { MessageList } from "@/components/message-list";
import { PresenceAvatars } from "@/components/presence-avatars";
import { ThreadPanel } from "@/components/thread-panel";

export function Chat({ channel }: { channel: Channel }) {
  const createFeed = useCreateFeed();
  const room = useRoom();
  const ensuredFeedsRef = useRef(new Set<string>());
  const [openThreadMessageId, setOpenThreadMessageId] = useState<string | null>(
    null
  );

  useEffect(() => {
    if (ensuredFeedsRef.current.has(channel.id)) {
      return;
    }

    ensuredFeedsRef.current.add(channel.id);

    const ensureFeed = async () => {
      try {
        await createFeed(channel.id, {
          metadata: { name: channel.name, type: "channel" },
        });
      } catch {
        // Feed already exists.
      }
    };

    void ensureFeed();
  }, [channel.id, channel.name, createFeed]);

  return (
    <div className="flex h-full min-h-0 bg-white">
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex shrink-0 items-center gap-3 border-b border-neutral-200 px-4 py-3">
          <div className="min-w-0">
            <h2 className="truncate text-lg font-bold text-neutral-900">
              #{channel.name}
            </h2>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <ClientSideSuspense fallback={null}>
              <PresenceAvatars />
            </ClientSideSuspense>
            <HelpButton />
          </div>
        </header>

        <ClientSideSuspense fallback={null}>
          <MessageList
            channelId={channel.id}
            channelName={channel.name}
            onOpenThread={setOpenThreadMessageId}
          />
        </ClientSideSuspense>
        <ClientSideSuspense fallback={null}>
          <ChannelComposer channel={channel} roomId={room.id} />
        </ClientSideSuspense>
      </div>

      {openThreadMessageId ? (
        <ClientSideSuspense fallback={null}>
          <ThreadPanel
            channelId={channel.id}
            channelName={channel.name}
            parentMessageId={openThreadMessageId}
            roomId={room.id}
            onClose={() => setOpenThreadMessageId(null)}
          />
        </ClientSideSuspense>
      ) : null}
    </div>
  );
}
