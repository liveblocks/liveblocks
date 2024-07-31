"use client";

import { LABELS, RoomWithMetadata } from "@/config";
import { getUser } from "@/database";
import { ToImmutable } from "@liveblocks/core";
import Image from "next/image";

type Props = {
  room: RoomWithMetadata;
  storage: ToImmutable<Liveblocks["Storage"]>;
};

export function IssuesListRow({ room, storage }: Props) {
  const { issueId, title, priority, progress, assignedTo, labels } =
    room.metadata;

  const assignedUser = assignedTo !== "none" ? getUser(assignedTo) : null;

  const date = room.createdAt.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });

  return (
    <a
      href={`/issue/${issueId}`}
      className="flex h-10 items-center justify-between px-4 text-sm"
    >
      <div className="flex gap-2 items-center">
        <div className="w-12">{priority}</div>
        <div className="font-medium">{title}</div>
      </div>
      <div className="flex gap-5 items-center">
        {LABELS.filter((label) => labels.includes(label.id)).map(
          ({ id, text }) => (
            <div
              key={id}
              className="text-sm rounded-full px-2 py-0.5 border shadow-xs flex items-center gap-1.5 select-none text-neutral-700"
            >
              <div className="bg-neutral-400/60 rounded-full w-2 h-2" />
              {text}{" "}
            </div>
          )
        )}
        <div className="flex-none w-12 text-right">{date}</div>
        <div>
          {assignedUser ? (
            <Image
              className="w-6 h-6 rounded-full overflow-hidden"
              alt={assignedUser.info.name}
              src={assignedUser.info.avatar}
            />
          ) : (
            <div className="w-6 h-6 rounded-full overflow-hidden bg-neutral-200" />
          )}
        </div>
      </div>
    </a>
  );
}
