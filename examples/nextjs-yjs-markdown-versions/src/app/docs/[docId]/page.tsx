import { notFound, redirect } from "next/navigation";

import { auth } from "@/auth/manager";
import { ownerIdFromSession } from "@/lib/session-user";
import { buildRoomId } from "@/lib/liveblocks-server";
import { getDoc } from "../actions";
import { DocumentClient } from "./DocumentClient";

export default async function DocPage({
  params,
}: {
  params: Promise<{ docId: string }>;
}) {
  const session = await auth();
  const ownerId = ownerIdFromSession(session);
  if (!ownerId) {
    redirect("/signin");
  }

  const { docId } = await params;

  let doc;
  try {
    doc = await getDoc(docId);
  } catch {
    notFound();
  }

  const roomId = buildRoomId(ownerId, docId);

  return (
    <DocumentClient
      roomId={roomId}
      docId={docId}
      initialTitle={doc.metadata?.title ?? "Untitled document"}
    />
  );
}
