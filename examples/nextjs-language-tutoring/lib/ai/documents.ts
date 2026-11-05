import { LiveMap, LiveObject } from "@liveblocks/node";
import { nanoid } from "nanoid";
import { AI_USER } from "@/app/database";
import { liveblocks } from "@/lib/liveblocks-server";
import type { DocumentData, DocumentType } from "@/liveblocks.config";

export type DocumentSummary = {
  id: string;
  type: DocumentType;
  title: string;
  pageCount?: number;
};

// The documents in a room, from the `documents` list in Storage
export async function listDocuments(
  roomId: string
): Promise<DocumentSummary[]> {
  const storage = await liveblocks.getStorageDocument(roomId, "json");
  const documents =
    typeof storage === "object" && storage !== null && "documents" in storage
      ? storage.documents
      : undefined;
  if (!Array.isArray(documents)) return [];

  const result: DocumentSummary[] = [];
  for (const doc of documents) {
    if (typeof doc !== "object" || doc === null || Array.isArray(doc)) continue;
    const { id, type, title, pageCount } = doc;
    if (typeof id !== "string" || typeof title !== "string") continue;
    if (type !== "text" && type !== "whiteboard" && type !== "pdf") continue;
    result.push({
      id,
      type,
      title,
      ...(typeof pageCount === "number" ? { pageCount } : {}),
    });
  }
  return result;
}

// Creates an empty text document or whiteboard, the same way the sidebar's
// "New document" menu does (see `useCreateDocument` in
// `components/docs/use-documents.ts`), so it shows up for everyone at the
// top of the list. PDFs need an uploaded file, so the assistant can't create
// those.
export async function createDocument(
  roomId: string,
  type: "text" | "whiteboard",
  title: string
): Promise<DocumentSummary> {
  const id = nanoid(8);
  const cleanTitle = title.trim() || "Untitled";

  await liveblocks.mutateStorage(roomId, ({ root }) => {
    const documents = root.get("documents");
    const keys = documents.map(
      (existing) => existing.get("order") ?? -existing.get("createdAt")
    );
    const doc = new LiveObject<DocumentData>({
      id,
      type,
      title: cleanTitle,
      createdAt: Date.now(),
      createdBy: AI_USER.id,
      order: keys.length === 0 ? 0 : Math.min(...keys) - 1,
    });
    documents.push(doc);
    if (type === "whiteboard") {
      root.get("whiteboards").set(id, new LiveMap());
    }
  });

  return { id, type, title: cleanTitle };
}
