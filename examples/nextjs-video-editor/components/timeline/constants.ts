import type { TrackKind } from "@/lib/project";

export const HEADER_WIDTH = 168;
export const RULER_HEIGHT = 28;
export const ROW_HEIGHT: Record<TrackKind, number> = { visual: 60, audio: 48 };
export const CLIP_INSET = 4;
export const MIN_ZOOM = 6;
export const MAX_ZOOM = 320;
// Snap when within this many pixels of a clip edge, the playhead or a comment.
export const SNAP_PIXELS = 8;

export type ClipDragMode = "move" | "trim-start" | "trim-end";
