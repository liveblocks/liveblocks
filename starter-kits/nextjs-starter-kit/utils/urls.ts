import { customAlphabet } from "nanoid";
import { Document } from "@/types";

const ALPHANUMERIC =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
const ID_LENGTH = 10;

export function generateNewRoomId() {
  const nanoid = customAlphabet(ALPHANUMERIC, ID_LENGTH);
  return nanoid();
}

export function getDocumentUrl(document: Document) {
  const idParam = getDocumentIdParam(document);
  return `/${document.type}/${idParam}`;
}

export function getDocumentIdParam({ name, id }: { name: string; id: string }) {
  const slug = slugify(name);
  return `${slug}~${id}`;
}

export function getDocumentId(idParam: string) {
  return idParam.split("~").pop() || idParam;
}

export function isDocumentUrlHealed(document: Document, idParam: string) {
  return idParam === getDocumentIdParam(document);
}

function slugify(title: string) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9-\s]/g, "") // only alphanumeric and hyphens
    .replace(/\s+/g, "-") // spaces to hyphens
    .replace(/-+/g, "-") // no duplicate hyphens
    .replace(/^-+|-+$/g, ""); // no leading/trailing hyphens
}
