"use client";

import {
  CheckIcon,
  CopyIcon,
  GraduationCapIcon,
  Loader2Icon,
  Trash2Icon,
  UserPlusIcon,
  XIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useApp } from "@/components/app-context";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { UserAvatar } from "@/components/user-avatar";
import type { LessonRoomDetails } from "@/lib/api";
import type { RoomShellProps } from "./room-shell";

export function MembersDialog({
  room,
  onRoomChange,
  refreshRoom,
}: Pick<RoomShellProps, "room" | "onRoomChange" | "refreshRoom">) {
  const { user, api, href, params } = useApp();
  const router = useRouter();
  const isTutor = user?.id === room.ownerId;
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const inviteUrl =
    typeof window !== "undefined" && room.inviteToken
      ? new URL(
          href(
            `/join/${encodeURIComponent(room.id)}?t=${encodeURIComponent(room.inviteToken)}`
          ),
          window.location.origin
        ).toString()
      : null;

  async function copyInvite() {
    if (!inviteUrl) return;
    await navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  async function removeMember(userId: string) {
    setBusy(userId);
    setError(null);
    try {
      const updated = await api<LessonRoomDetails>(
        `/api/rooms/${encodeURIComponent(room.id)}/members/${encodeURIComponent(userId)}`,
        { method: "DELETE" }
      );
      if (userId === user?.id) {
        router.push(href("/"));
        return;
      }
      onRoomChange({ ...updated, inviteToken: room.inviteToken });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not remove");
    } finally {
      setBusy(null);
    }
  }

  async function deleteRoom() {
    if (!window.confirm("Delete this room and all of its documents?")) return;
    setBusy("delete");
    try {
      await api(`/api/rooms/${encodeURIComponent(room.id)}`, {
        method: "DELETE",
      });
      router.push(href("/"));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not delete");
      setBusy(null);
    }
  }

  return (
    <Dialog
      onOpenChange={(open) => {
        if (open) {
          setError(null);
          void refreshRoom();
        }
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <UserPlusIcon />
          {isTutor ? "Invite" : "Members"}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Room members</DialogTitle>
          <DialogDescription>
            Everyone listed here can open this room, edit its documents, and
            read the chat.
          </DialogDescription>
        </DialogHeader>

        <ul className="flex flex-col gap-2">
          {room.members.map((member) => (
            <li key={member.id} className="flex items-center gap-3 text-sm">
              <UserAvatar info={member.info} size={32} title={member.id} />
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate font-medium">
                  {member.info?.name ?? member.id}
                  {member.id === user?.id ? (
                    <span className="font-normal text-neutral-400"> (you)</span>
                  ) : null}
                </span>
                <span className="truncate text-xs text-neutral-500">
                  {member.id}
                </span>
              </span>
              {member.role === "tutor" ? (
                <span className="inline-flex items-center gap-1 text-xs text-neutral-500">
                  <GraduationCapIcon className="size-3.5" aria-hidden />
                  Tutor
                </span>
              ) : isTutor || member.id === user?.id ? (
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={
                    member.id === user?.id ? "Leave room" : "Remove member"
                  }
                  disabled={busy !== null}
                  onClick={() => void removeMember(member.id)}
                >
                  {busy === member.id ? (
                    <Loader2Icon className="animate-spin" />
                  ) : (
                    <XIcon />
                  )}
                </Button>
              ) : null}
            </li>
          ))}
        </ul>

        {isTutor ? (
          <>
            <div className="mt-2">
              <p className="mb-1.5 text-sm font-medium">Invite a student</p>
              <p className="mb-2 text-xs text-neutral-500">
                Share this link. Anyone who signs in and opens it joins the
                room.
                {params.examplePreview !== null
                  ? " In the gallery, open it in another preview pane."
                  : ""}
              </p>
              <div className="flex gap-2">
                <Input
                  readOnly
                  value={inviteUrl ?? "Loading…"}
                  onFocus={(event) => event.currentTarget.select()}
                  className="font-mono text-xs"
                />
                <Button
                  variant="outline"
                  onClick={() => void copyInvite()}
                  disabled={!inviteUrl}
                >
                  {copied ? <CheckIcon /> : <CopyIcon />}
                  {copied ? "Copied" : "Copy"}
                </Button>
              </div>
            </div>

            <div className="mt-2 flex items-center justify-between gap-3 rounded-md border border-red-200 bg-red-50 p-3">
              <p className="text-xs text-red-700">
                Deleting the room removes all documents, PDFs, and messages.
              </p>
              <Button
                variant="destructive"
                size="sm"
                disabled={busy !== null}
                onClick={() => void deleteRoom()}
              >
                {busy === "delete" ? (
                  <Loader2Icon className="animate-spin" />
                ) : (
                  <Trash2Icon />
                )}
                Delete
              </Button>
            </div>
          </>
        ) : null}

        {error ? (
          <p role="alert" className="text-sm text-red-600">
            {error}
          </p>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
