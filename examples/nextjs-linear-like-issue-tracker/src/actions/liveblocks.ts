"use server";

import { unstable_noStore as noStore } from "next/cache";
import { after } from "next/server";
import { redirect } from "next/navigation";
import { RoomWithMetadata } from "@/config";
import { liveblocks } from "@/liveblocks.server.config";
import { createIssueRoomForAi } from "@/lib/create-issue-room";
import {
  prepareAiIssueButton,
  runAiIssueButtonStream,
} from "@/lib/ai-issue-button";
import type { AiIssueButtonKind } from "@/lib/ai-issue-button-prompts";

export async function createIssue() {
  const { issueId } = await createIssueRoomForAi("Untitled");
  redirect(`/issue/${issueId}`);
}

export async function getStorageDocument(roomId: string) {
  const storage = await liveblocks.getStorageDocument(roomId, "json");
  return storage;
}

export async function getRoomsFromIds(roomIds: string[]) {
  noStore();
  const rooms = await Promise.all(
    roomIds.map((roomId) => liveblocks.getRoom(roomId))
  );
  return rooms as RoomWithMetadata[];
}

export async function deleteRoom(roomId: string) {
  await liveblocks.deleteRoom(roomId);
  redirect("/");
}

export async function runIssueButtonAi(
  kind: AiIssueButtonKind,
  issueId: string,
  requestedByUserId: string
): Promise<{ ok: true; feedId: string } | { ok: false; error: string }> {
  const prep = await prepareAiIssueButton({
    issueId,
    requestedByUserId,
    kind,
  });
  if (!prep.ok) {
    return { ok: false, error: prep.error };
  }

  after(() => {
    void runAiIssueButtonStream(prep.ctx).then(
      (result) => {
        if (result.error) {
          console.error("[issue-button]", kind, result.error);
        }
      },
      (err) => {
        console.error("[issue-button]", kind, err);
      }
    );
  });

  return { ok: true, feedId: prep.ctx.feedId };
}
