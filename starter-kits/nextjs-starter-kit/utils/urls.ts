import { RoomData } from "@liveblocks/node";
import { Document } from "@/types";

export function getDocumentUrl(document: Document) {
  const slug = slugify(document.name);
  return `${document.type}/${slug}-${document.id}`;
}

export function getDocumentId(idParam: string) {
  return idParam.split("-").pop() || idParam;
}

export function isDocumentUrlHealed(room: RoomData) {
  if (!room.id.includes("-")) {
    return room.id;
  }

  return true;
}

function slugify(title: string) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "") // only alphanumeric
    .replace(/\s+/g, "-") // spaces to hyphens
    .replace(/-+/g, "-") // no duplicate hyphens
    .replace(/^-+|-+$/g, ""); // no leading/trailing hyphens
}
