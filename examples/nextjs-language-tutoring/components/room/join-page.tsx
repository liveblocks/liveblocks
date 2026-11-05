"use client";

import { Loader2Icon } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useApp } from "@/components/app-context";
import { FullPageSpinner } from "@/components/home/home-page";
import { SignIn } from "@/components/sign-in";
import { Button } from "@/components/ui/button";
import type { LessonRoom } from "@/lib/api";

// Landing page for invite links (`/join/<roomId>?t=<token>`). Once the user
// is signed in, it adds them to the room and redirects into it.
export function JoinPage({ roomId }: { roomId: string }) {
  const { user, api, href } = useApp();
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("t") ?? "";
  const [error, setError] = useState<string | null>(null);
  const started = useRef(false);

  useEffect(() => {
    if (!user || started.current) {
      return;
    }
    started.current = true;
    api<LessonRoom>(`/api/rooms/${encodeURIComponent(roomId)}/join`, {
      method: "POST",
      json: { token },
    })
      .then((room) => {
        router.replace(href(`/rooms/${encodeURIComponent(room.id)}`));
      })
      .catch((cause: unknown) => {
        started.current = false;
        setError(
          cause instanceof Error ? cause.message : "Could not join the room"
        );
      });
  }, [user, api, href, roomId, token, router]);

  if (user === null) {
    return <FullPageSpinner />;
  }
  if (user === undefined) {
    return <SignIn />;
  }

  return (
    <main className="flex h-full min-h-full items-center justify-center p-6">
      <div className="flex w-full max-w-sm flex-col items-center gap-4 rounded-lg bg-white p-6 text-center shadow ring-1 ring-neutral-950/5">
        {error ? (
          <>
            <p className="font-medium">Couldn&apos;t join this room</p>
            <p className="text-sm text-neutral-500">{error}</p>
            <Button asChild variant="outline">
              <Link href={href("/")}>Back to your rooms</Link>
            </Button>
          </>
        ) : (
          <>
            <Loader2Icon className="size-5 animate-spin text-neutral-400" />
            <p className="text-sm text-neutral-500">Joining the room…</p>
          </>
        )}
      </div>
    </main>
  );
}
