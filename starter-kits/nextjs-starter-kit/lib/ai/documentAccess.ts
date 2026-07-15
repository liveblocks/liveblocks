import { RoomData } from "@liveblocks/node";
import { Session } from "next-auth";
import { auth } from "@/auth";
import { DEFAULT_ORGANIZATION_ID } from "@/constants";
import { userAllowedInRoom } from "@/lib/utils";
import { liveblocks } from "@/liveblocks.server.config";
import { DocumentRoomMetadata } from "@/types";

type DocumentAccessResult =
  | {
      room: RoomData;
      metadata: DocumentRoomMetadata;
      session: Session | null;
      error?: never;
    }
  | {
      room?: never;
      metadata?: never;
      session?: never;
      error: { code: number; message: string };
    };

/**
 * Server-side access check for the AI API routes. Verifies that the current
 * user (from the NextAuth session) has access to the given document/room
 * before any AI work happens on their behalf.
 */
export async function checkDocumentAccess(
  roomId: string,
  accessAllowed: "read" | "write"
): Promise<DocumentAccessResult> {
  let session: Session | null;
  let room: RoomData | null;
  try {
    [session, room] = await Promise.all([auth(), liveblocks.getRoom(roomId)]);
  } catch (err) {
    console.error(err);
    return { error: { code: 500, message: "Error fetching document" } };
  }

  if (!room) {
    return { error: { code: 404, message: "Document not found" } };
  }

  if (
    !userAllowedInRoom({
      accessAllowed,
      userId: session?.user.info.id ?? "",
      room,
      organizationId:
        session?.user.currentOrganizationId ?? DEFAULT_ORGANIZATION_ID,
    })
  ) {
    return { error: { code: 403, message: "Not allowed access" } };
  }

  return { room, metadata: room.metadata as DocumentRoomMetadata, session };
}
