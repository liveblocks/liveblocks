"use client";

import { GraduationCapIcon } from "lucide-react";
import Link from "next/link";
import { useApp } from "@/components/app-context";
import { Badge } from "@/components/ui/badge";
import { UserAvatar } from "@/components/user-avatar";
import type { LessonRoom } from "@/lib/api";
import { getLanguage } from "@/lib/languages";
import { getRoomTitle } from "@/lib/room-title";

export function RoomCard({ room }: { room: LessonRoom }) {
  const { href, user } = useApp();
  const language = getLanguage(room.language);
  const isTutor = user?.id === room.ownerId;
  const tutor = room.members.find((member) => member.role === "tutor");
  const students = room.members.filter((member) => member.role === "student");

  return (
    <Link
      href={href(`/rooms/${encodeURIComponent(room.id)}`)}
      className="group flex flex-col gap-4 rounded-lg bg-white p-5 shadow ring-1 ring-neutral-950/5 transition hover:ring-neutral-950/15 focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span
            className="flex size-10 shrink-0 items-center justify-center rounded-md bg-neutral-100 text-xl"
            aria-hidden
          >
            {language.flag}
          </span>
          <div className="min-w-0">
            <h2 className="truncate font-semibold group-hover:underline">
              {getRoomTitle(room.members)}
            </h2>
            <p className="text-sm text-neutral-500">{language.name}</p>
          </div>
        </div>
        <Badge variant={isTutor ? "default" : "secondary"}>
          {isTutor ? "You teach" : "You learn"}
        </Badge>
      </div>

      <div>
        <p className="mb-2 text-xs font-medium tracking-wide text-neutral-400 uppercase">
          Who has access
        </p>
        <ul className="flex flex-col gap-1.5">
          {tutor ? <MemberRow member={tutor} /> : null}
          {students.map((member) => (
            <MemberRow key={member.id} member={member} />
          ))}
          {students.length === 0 ? (
            <li className="text-sm text-neutral-500 italic">
              No student yet — open the room to invite one.
            </li>
          ) : null}
        </ul>
      </div>

      <p className="text-xs text-neutral-400">
        {room.lastConnectionAt
          ? `Last active ${formatRelative(room.lastConnectionAt)}`
          : `Created ${formatRelative(room.createdAt)}`}
      </p>
    </Link>
  );
}

function MemberRow({ member }: { member: LessonRoom["members"][number] }) {
  const { user } = useApp();
  return (
    <li className="flex items-center gap-2 text-sm">
      <UserAvatar info={member.info} size={24} title={member.id} />
      <span className="truncate">
        {member.info?.name ?? member.id}
        {member.id === user?.id ? (
          <span className="text-neutral-400"> (you)</span>
        ) : null}
      </span>
      {member.role === "tutor" ? (
        <span className="ml-auto inline-flex items-center gap-1 text-xs text-neutral-500">
          <GraduationCapIcon className="size-3.5" aria-hidden />
          Tutor
        </span>
      ) : null}
    </li>
  );
}

export function formatRelative(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.round(diff / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days} d ago`;
  return new Date(iso).toLocaleDateString();
}
