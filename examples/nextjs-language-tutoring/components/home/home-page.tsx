"use client";

import { Loader2Icon } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useApp } from "@/components/app-context";
import { SignIn } from "@/components/sign-in";
import type { LessonRoom } from "@/lib/api";
import { NewRoomDialog } from "./new-room-dialog";
import { RoomCard } from "./room-card";

export function HomePage() {
  const { user } = useApp();

  if (user === null) {
    return <FullPageSpinner />;
  }
  if (user === undefined) {
    return <SignIn />;
  }
  return <RoomList />;
}

function RoomList() {
  const { api, user } = useApp();
  const [rooms, setRooms] = useState<LessonRoom[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setRooms(await api<LessonRoom[]>("/api/rooms"));
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Could not load your rooms"
      );
    }
  }, [api]);

  useEffect(() => {
    void load();
  }, [load, user?.id]);

  return (
    <main className="mx-auto flex min-h-full w-full max-w-5xl flex-col px-6 py-8">
      <header className="mb-8 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Your rooms</h1>
          <p className="mt-1 text-sm text-neutral-500">
            Each room is a permanent place where a tutor and a student learn
            together.
          </p>
        </div>
        <NewRoomDialog />
      </header>

      {error ? (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      ) : rooms === null ? (
        <div className="flex flex-1 items-center justify-center py-20">
          <Loader2Icon className="size-5 animate-spin text-neutral-400" />
        </div>
      ) : rooms.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-neutral-300 py-20 text-center">
          <p className="font-medium">No rooms yet</p>
          <p className="max-w-sm text-sm text-neutral-500">
            Create a room for your first student, or ask your tutor for an
            invite link.
          </p>
          <div className="mt-2">
            <NewRoomDialog />
          </div>
        </div>
      ) : (
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {rooms.map((room) => (
            <li key={room.id}>
              <RoomCard room={room} />
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}

export function FullPageSpinner() {
  return (
    <div className="flex h-full min-h-full items-center justify-center">
      <Loader2Icon className="size-5 animate-spin text-neutral-400" />
    </div>
  );
}
