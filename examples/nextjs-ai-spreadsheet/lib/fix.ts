import type { CellFormat } from "@/liveblocks.config";

/**
 * A ready-to-apply fix, produced by the reviewer alongside its comment and
 * stored (as JSON) in the comment's `metadata.fix`. Pressing "Fix it" applies
 * it straight away with `mutateStorage` — no second LLM round-trip.
 *
 * Shared by the client (button label / preview) and the server (apply), so
 * this file must not import anything server-only.
 */

export type FixOp =
  | { op: "setValue"; cell: string; value: string }
  | { op: "format"; range: string; format: CellFormat };

export type Fix = { ops: FixOp[] };

// Comment metadata string values are capped at 4000 characters.
export const MAX_FIX_JSON_LENGTH = 4000;

export function serializeFix(fix: Fix): string | null {
  if (fix.ops.length === 0) {
    return null;
  }
  const json = JSON.stringify(fix);
  return json.length <= MAX_FIX_JSON_LENGTH ? json : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

const ALIGNS = ["left", "center", "right"] as const;
const NUMBER_FORMATS = ["general", "currency", "percent"] as const;

function isOneOf<T extends string>(
  options: readonly T[],
  value: unknown
): value is T {
  return (
    typeof value === "string" && (options as readonly string[]).includes(value)
  );
}

function parseFormat(value: unknown): CellFormat | null {
  if (!isRecord(value)) {
    return null;
  }
  const format: CellFormat = {};
  for (const key of ["bold", "italic", "underline", "strike"] as const) {
    const flag = value[key];
    if (typeof flag === "boolean") {
      format[key] = flag;
    }
  }
  if (isOneOf(ALIGNS, value.align)) {
    format.align = value.align;
  }
  for (const key of ["color", "background"] as const) {
    const color = value[key];
    if (typeof color === "string") {
      format[key] = color;
    }
  }
  if (isOneOf(NUMBER_FORMATS, value.numberFormat)) {
    format.numberFormat = value.numberFormat;
  }
  return format;
}

// Parse a fix stored in comment metadata. Defensive: metadata is user-editable
// in principle, so anything malformed yields null rather than a bad edit.
export function parseFix(json: string | undefined): Fix | null {
  if (!json) {
    return null;
  }
  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch {
    return null;
  }
  if (!isRecord(raw) || !Array.isArray(raw.ops)) {
    return null;
  }
  const ops: FixOp[] = [];
  for (const item of raw.ops) {
    if (!isRecord(item)) {
      return null;
    }
    if (
      item.op === "setValue" &&
      typeof item.cell === "string" &&
      typeof item.value === "string"
    ) {
      ops.push({ op: "setValue", cell: item.cell, value: item.value });
    } else if (item.op === "format" && typeof item.range === "string") {
      const format = parseFormat(item.format);
      if (!format) {
        return null;
      }
      ops.push({ op: "format", range: item.range, format });
    } else {
      return null;
    }
  }
  return ops.length > 0 ? { ops } : null;
}

// Human-readable one-liner, e.g. `Set B2 to "1,200"; format B2:B9 as currency`.
export function describeFix(fix: Fix): string {
  return fix.ops
    .map((op) => {
      if (op.op === "setValue") {
        return op.value === ""
          ? `Clear ${op.cell.toUpperCase()}`
          : `Set ${op.cell.toUpperCase()} to "${op.value}"`;
      }
      const parts: string[] = [];
      if (op.format.numberFormat) {
        parts.push(`as ${op.format.numberFormat}`);
      }
      for (const key of ["bold", "italic", "underline", "strike"] as const) {
        if (op.format[key] === true) {
          parts.push(key);
        }
      }
      if (op.format.align) {
        parts.push(`align ${op.format.align}`);
      }
      if (op.format.color) {
        parts.push(`color ${op.format.color}`);
      }
      if (op.format.background) {
        parts.push(`fill ${op.format.background}`);
      }
      return `Format ${op.range.toUpperCase()}${
        parts.length ? ` ${parts.join(", ")}` : ""
      }`;
    })
    .join("; ");
}
