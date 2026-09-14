"use client";

import { shallow } from "@liveblocks/react";
import { useOthersMapped } from "@liveblocks/react/suspense";
import {
  PEN_BY_ID,
  polylinePath,
  strokePath,
  type Point,
  type Stroke,
} from "drawesome";
import { useRef } from "react";
import { BOARD } from "@/lib/board";
import { ownerConnectionId, type DraftStroke } from "@/lib/strokes";

type HeldDraft = {
  draft: DraftStroke;
  signature: string;
};

type DraftStrokesOverlayProps = {
  /** Strokes currently painted on this client — used to know when a held draft can drop. */
  strokes: readonly Stroke[];
};

/**
 * Presence drafts clear before Storage strokes are painted, which flashes ink
 * away. Hold each peer's last draft until our local stroke list for them changes.
 */
export function DraftStrokesOverlay({ strokes }: DraftStrokesOverlayProps) {
  const drafts = useOthersMapped(
    (other) => ({
      connectionId: other.connectionId,
      draft: other.presence.draft,
    }),
    shallow
  );
  const heldRef = useRef(new Map<number, HeldDraft>());

  const active: { connectionId: number; draft: DraftStroke }[] = [];

  for (const [, { connectionId, draft }] of drafts) {
    const signature = ownerSignature(strokes, connectionId);

    if (draft?.points.length) {
      heldRef.current.set(connectionId, { draft, signature });
      active.push({ connectionId, draft });
      continue;
    }

    const held = heldRef.current.get(connectionId);
    if (held && ownerSignature(strokes, connectionId) === held.signature) {
      active.push({ connectionId, draft: held.draft });
    } else if (held) {
      heldRef.current.delete(connectionId);
    }
  }

  // Drop held drafts for peers who left.
  const liveIds = new Set(drafts.map(([, { connectionId }]) => connectionId));
  for (const connectionId of heldRef.current.keys()) {
    if (!liveIds.has(connectionId)) {
      heldRef.current.delete(connectionId);
    }
  }

  if (active.length === 0) {
    return null;
  }

  return (
    <svg
      className="pointer-events-none absolute inset-0 z-10 h-full w-full"
      viewBox={`0 0 ${BOARD.w} ${BOARD.h}`}
      preserveAspectRatio="xMidYMid meet"
      aria-hidden
    >
      {active.map(({ connectionId, draft }) => (
        <DraftPath key={connectionId} draft={draft} />
      ))}
    </svg>
  );
}

function ownerSignature(strokes: readonly Stroke[], connectionId: number) {
  let signature = "";
  for (const stroke of strokes) {
    if (ownerConnectionId(stroke.id) === connectionId) {
      signature += `${stroke.id},`;
    }
  }
  return signature;
}

function DraftPath({ draft }: { draft: DraftStroke }) {
  if (draft.erase) {
    return (
      <path
        d={polylinePath(draft.points as Point[])}
        fill="none"
        stroke="rgb(0 0 0 / 0.2)"
        strokeWidth={draft.size}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    );
  }

  const d = strokePath(
    draft.pen,
    draft.size,
    draft.points as Point[],
    false,
    draft.shape
  );

  return (
    <path
      d={d}
      fill={draft.color}
      fillOpacity={draft.opacity}
      style={
        PEN_BY_ID[draft.pen].blend === "multiply"
          ? { mixBlendMode: "multiply" }
          : undefined
      }
    />
  );
}
