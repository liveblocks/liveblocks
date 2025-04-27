import { RoomData } from "@liveblocks/node";

export function getDocumentUrl(room: RoomData) {
  const id = room.id;
  const title = room.metadata.title;

  return `${room.metadata.type}/${title}-${id}`;
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

function getSlugFromTitle(title: string) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "") // only alphanumeric
    .replace(/\s+/g, "-") // spaces to hyphens
    .replace(/-+/g, "-") // no duplicate hyphens
    .replace(/^-+|-+$/g, ""); // no leading/trailing hyphens
}
