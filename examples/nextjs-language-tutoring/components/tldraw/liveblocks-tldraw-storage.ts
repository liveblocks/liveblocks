import {
  LiveObject,
  type JsonObject,
  type LsonObject,
  type ReadonlyJsonObject,
} from "@liveblocks/client";
import type { TLRecord } from "tldraw";

export type LiveblocksTldrawRecord = LiveObject<LsonObject>;
export type LiveblocksTldrawRecordValue = LiveblocksTldrawRecord | JsonObject;

export function createLiveblocksRecord(
  record: TLRecord
): LiveblocksTldrawRecord {
  return LiveObject.from(getLiveblocksJsonObject(record));
}

export function reconcileLiveblocksRecord(
  liveRecord: LiveblocksTldrawRecord,
  record: TLRecord
) {
  liveRecord.reconcile(getLiveblocksJsonObject(record));
}

export function getTldrawRecord(
  liveRecord: LiveblocksTldrawRecordValue | null | undefined
): TLRecord | undefined {
  const record = getTldrawRecordJson(liveRecord);
  if (!record) {
    return undefined;
  }

  if (!isTldrawRecordLike(record)) {
    return undefined;
  }

  return record as unknown as TLRecord;
}

export function isLiveblocksRecord(
  value: unknown
): value is LiveblocksTldrawRecord {
  return value instanceof LiveObject;
}

function getTldrawRecordJson(
  liveRecord: LiveblocksTldrawRecordValue | null | undefined
): ReadonlyJsonObject | undefined {
  if (isLiveblocksRecord(liveRecord)) {
    return liveRecord.toJSON();
  }

  if (!isReadonlyJsonObject(liveRecord)) {
    return undefined;
  }

  return liveRecord;
}

export function getLiveblocksJsonObject(record: TLRecord): JsonObject {
  return record as unknown as JsonObject;
}

function isReadonlyJsonObject(value: unknown): value is ReadonlyJsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isTldrawRecordLike(
  value: ReadonlyJsonObject
): value is ReadonlyJsonObject & { id: string; typeName: string } {
  return typeof value.id === "string" && typeof value.typeName === "string";
}
