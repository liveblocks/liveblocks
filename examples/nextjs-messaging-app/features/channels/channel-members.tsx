"use client";

import * as Popover from "@radix-ui/react-popover";
import { useSelf } from "@liveblocks/react/suspense";
import { UsersIcon } from "lucide-react";
import { AI_USER, AI_USER_ID, getUsers } from "@/lib/database";
import { useUserPresence } from "@/lib/presence";
import { StatusEmoji } from "@/primitives/status-emoji";

type Member = {
  id: string;
  name: string;
  avatar: string;
};

const MEMBERS: Member[] = [
  ...getUsers().map((user) => ({
    id: user.id,
    name: user.info.name,
    avatar: user.info.avatar,
  })),
  {
    id: AI_USER.id,
    name: AI_USER.info.name,
    avatar: AI_USER.info.avatar,
  },
];

export function ChannelMembers() {
  const selfId = useSelf((me) => me.id);
  const presence = useUserPresence();

  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <button
          type="button"
          title="View members of this channel"
          aria-label="View members of this channel"
          className="flex items-center gap-1.5 rounded-md px-2 py-1 text-sm font-medium text-neutral-600 transition-colors hover:bg-neutral-100 hover:text-neutral-900"
        >
          <UsersIcon className="size-4" aria-hidden />
          <span className="tabular-nums">{MEMBERS.length}</span>
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          side="bottom"
          align="end"
          sideOffset={6}
          collisionPadding={8}
          className="z-30 w-72 overflow-hidden rounded border border-neutral-200 bg-white shadow-lg"
        >
          <h3 className="border-b border-neutral-200 px-3 py-2 text-sm font-semibold text-neutral-900">
            {MEMBERS.length} members
          </h3>
          <ul className="max-h-64 overflow-y-auto py-1">
            {MEMBERS.map((member) => {
              const isAgent = member.id === AI_USER_ID;
              const entry = presence.get(member.id);
              const isOnline = isAgent || (entry?.online ?? false);
              const label = isOnline ? "Online" : entry ? "Away" : "Offline";

              return (
                <li
                  key={member.id}
                  className="flex items-center gap-2 px-3 py-1.5 text-sm text-neutral-800"
                >
                  <span className="inline-block size-5 min-h-5 min-w-5 shrink-0 overflow-hidden rounded bg-neutral-200">
                    <img
                      src={member.avatar}
                      alt=""
                      className="size-full object-cover"
                    />
                  </span>
                  <span className="flex min-w-0 flex-1 items-center gap-2 font-semibold">
                    <span className="truncate">{member.name}</span>
                    <StatusEmoji status={entry?.status} />
                    {member.id === selfId ? (
                      <span className="font-normal text-neutral-400">
                        (you)
                      </span>
                    ) : null}
                    {isAgent ? (
                      <span className="mt-px shrink-0 rounded-full bg-brand-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-brand-600">
                        Agent
                      </span>
                    ) : null}
                  </span>
                  <span
                    className={
                      isOnline
                        ? "size-2 shrink-0 rounded-full bg-green-500"
                        : "size-2 shrink-0 rounded-full border-[1.5px] border-neutral-400"
                    }
                    aria-label={label}
                  />
                  <span className="text-neutral-400">{label}</span>
                </li>
              );
            })}
          </ul>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
