import { LiveList, LiveMap, LiveObject } from "@liveblocks/client";
import { nanoid } from "nanoid";

export type AspectId = "16:9" | "9:16" | "1:1";
export type TrackKind = "visual" | "audio";
export type ClipType = "video" | "audio" | "text";
export type LookId =
  | "none"
  | "vivid"
  | "warm"
  | "cool"
  | "fade"
  | "mono"
  | "noir";
export type MotionId = "none" | "push-in" | "pull-out" | "rise" | "pop";
export type TextStyleId = "title" | "subtitle" | "lower-third" | "caption";
export type FontId = "sans" | "serif" | "display" | "mono";

export type ProjectLson = {
  name: string;
  aspect: AspectId;
  background: string;
};

export type TrackLson = {
  id: string;
  kind: TrackKind;
  name: string;
  // Visual tracks can be hidden from the preview, audio tracks muted.
  hidden: boolean;
  muted: boolean;
  // Locked tracks can't be edited from the timeline.
  locked: boolean;
};

/**
 * Every clip has the same fields, whatever its type, so any clip can be read
 * and written the same way; the inspector only shows the ones that apply.
 */
export type ClipLson = {
  id: string;
  type: ClipType;
  trackId: string;
  // Media in `lib/media.ts`, or null for text.
  assetId: string | null;
  // Where the clip sits on the timeline, in seconds.
  start: number;
  duration: number;
  // Where the clip starts in its media file, in seconds (its "in point").
  offset: number;
  fadeIn: number;
  fadeOut: number;
  // Placement in the frame: offsets as a fraction of the frame's size.
  x: number;
  y: number;
  scale: number;
  opacity: number;
  look: LookId;
  motion: MotionId;
  text: string;
  textStyle: TextStyleId;
  font: FontId;
  color: string;
  volume: number;
};

export type Project = Readonly<ProjectLson>;
export type Track = Readonly<TrackLson>;
export type Clip = Readonly<ClipLson>;

export const FPS = 30;
export const MIN_CLIP_DURATION = 0.2;

export const ASPECTS: { id: AspectId; label: string; ratio: number }[] = [
  { id: "16:9", label: "Landscape", ratio: 16 / 9 },
  { id: "9:16", label: "Vertical", ratio: 9 / 16 },
  { id: "1:1", label: "Square", ratio: 1 },
];

export function aspectRatio(aspect: AspectId) {
  return ASPECTS.find((item) => item.id === aspect)?.ratio ?? 16 / 9;
}

export const BACKGROUNDS = ["#000000", "#0B1220", "#1E1B2E", "#F5F0E8"];

export const LOOKS: { id: LookId; label: string; filter: string }[] = [
  { id: "none", label: "Original", filter: "none" },
  { id: "vivid", label: "Vivid", filter: "saturate(1.45) contrast(1.08)" },
  {
    id: "warm",
    label: "Warm",
    filter: "sepia(0.28) saturate(1.35) hue-rotate(-10deg) brightness(1.02)",
  },
  {
    id: "cool",
    label: "Cool",
    filter: "saturate(1.15) hue-rotate(14deg) brightness(1.04)",
  },
  {
    id: "fade",
    label: "Faded",
    filter: "contrast(0.82) brightness(1.1) saturate(0.75)",
  },
  { id: "mono", label: "Mono", filter: "grayscale(1) contrast(1.1)" },
  {
    id: "noir",
    label: "Noir",
    filter: "grayscale(1) contrast(1.5) brightness(0.88)",
  },
];

export function lookFilter(look: LookId) {
  return LOOKS.find((item) => item.id === look)?.filter ?? "none";
}

export const VIDEO_MOTIONS: { id: MotionId; label: string }[] = [
  { id: "none", label: "None" },
  { id: "push-in", label: "Push in" },
  { id: "pull-out", label: "Pull out" },
];

export const TEXT_MOTIONS: { id: MotionId; label: string }[] = [
  { id: "none", label: "None" },
  { id: "rise", label: "Rise" },
  { id: "pop", label: "Pop" },
];

export const TEXT_STYLES: {
  id: TextStyleId;
  label: string;
  sample: string;
  font: FontId;
  duration: number;
}[] = [
  {
    id: "title",
    label: "Title",
    sample: "Island Escape",
    font: "serif",
    duration: 4,
  },
  {
    id: "subtitle",
    label: "Subtitle",
    sample: "CHAPTER ONE",
    font: "sans",
    duration: 3,
  },
  {
    id: "lower-third",
    label: "Lower third",
    sample: "Day one — the coast",
    font: "sans",
    duration: 4,
  },
  {
    id: "caption",
    label: "Caption",
    sample: "Rice fields at first light",
    font: "sans",
    duration: 3,
  },
];

export const FONTS: { id: FontId; label: string; className: string }[] = [
  { id: "sans", label: "Sans", className: "font-sans" },
  { id: "serif", label: "Serif", className: "font-serif" },
  { id: "display", label: "Display", className: "font-display" },
  { id: "mono", label: "Mono", className: "font-mono" },
];

export function fontClassName(font: FontId) {
  return FONTS.find((item) => item.id === font)?.className ?? "font-sans";
}

export const TEXT_COLORS = [
  "#FFFFFF",
  "#FDE68A",
  "#FDBA74",
  "#A5F3FC",
  "#C4B5FD",
  "#111111",
];

const CLIP_DEFAULTS: Omit<
  ClipLson,
  "id" | "type" | "trackId" | "start" | "duration"
> = {
  assetId: null,
  offset: 0,
  fadeIn: 0,
  fadeOut: 0,
  x: 0,
  y: 0,
  scale: 1,
  opacity: 1,
  look: "none",
  motion: "none",
  text: "",
  textStyle: "title",
  font: "sans",
  color: "#FFFFFF",
  volume: 1,
};

export function createClipId() {
  return `clip-${nanoid(8)}`;
}

export function createTrackId() {
  return `track-${nanoid(8)}`;
}

export function createClip(
  clip: Pick<ClipLson, "type" | "trackId" | "start" | "duration"> &
    Partial<ClipLson>
): ClipLson {
  return { ...CLIP_DEFAULTS, id: createClipId(), ...clip };
}

export function createTrack(kind: TrackKind, name: string): TrackLson {
  return {
    id: createTrackId(),
    kind,
    name,
    hidden: false,
    muted: false,
    locked: false,
  };
}

export function trackAccepts(track: Track, type: ClipType) {
  return track.kind === (type === "audio" ? "audio" : "visual");
}

/** The project every new room starts with: a 30 second travel reel. */
export function createInitialStorage(): Liveblocks["Storage"] {
  const titles = createTrack("visual", "Titles");
  const video = createTrack("visual", "Video");
  const music = createTrack("audio", "Music");
  const ambience = createTrack("audio", "Ambience");

  const shot = (
    assetId: string,
    start: number,
    duration: number,
    clip: Partial<ClipLson> = {}
  ) =>
    createClip({
      type: "video",
      trackId: video.id,
      assetId,
      start,
      duration,
      offset: 0.5,
      ...clip,
    });

  const text = (
    textStyle: TextStyleId,
    value: string,
    start: number,
    duration: number,
    clip: Partial<ClipLson> = {}
  ) =>
    createClip({
      type: "text",
      trackId: titles.id,
      textStyle,
      text: value,
      font: TEXT_STYLES.find((style) => style.id === textStyle)?.font ?? "sans",
      start,
      duration,
      fadeIn: 0.5,
      fadeOut: 0.5,
      ...clip,
    });

  const clips: ClipLson[] = [
    shot("reef", 0, 5, { fadeIn: 1, motion: "push-in" }),
    shot("surf", 5, 5, { offset: 1 }),
    shot("bay", 10, 4.5, { look: "vivid" }),
    shot("fields", 14.5, 5, { offset: 1, look: "warm" }),
    shot("shoreline", 19.5, 5, { motion: "pull-out" }),
    shot("sunset", 24.5, 5.5, { fadeOut: 1.5, look: "warm" }),

    text("title", "Island Escape", 0.6, 3.8, { motion: "rise" }),
    text("lower-third", "Day one — the turquoise coast", 6, 3.5),
    text("caption", "Rice fields at first light", 15.2, 3.4),
    text("title", "See you next summer", 25.4, 3.8, {
      motion: "rise",
      fadeOut: 1,
    }),

    createClip({
      type: "audio",
      trackId: music.id,
      assetId: "music",
      start: 0,
      duration: 30,
      volume: 0.8,
      fadeIn: 0.5,
      fadeOut: 2.5,
    }),
    createClip({
      type: "audio",
      trackId: ambience.id,
      assetId: "waves",
      start: 0,
      duration: 11,
      offset: 2,
      volume: 0.45,
      fadeIn: 1,
      fadeOut: 2,
    }),
    createClip({
      type: "audio",
      trackId: ambience.id,
      assetId: "whoosh",
      start: 13.8,
      duration: 1.6,
      volume: 0.5,
    }),
  ];

  return {
    project: new LiveObject({
      name: "Island Escape",
      aspect: "16:9",
      background: "#000000",
    }),
    tracks: new LiveList(
      [titles, video, music, ambience].map((track) => new LiveObject(track))
    ),
    clips: new LiveMap(
      clips.map((clip) => [clip.id, new LiveObject(clip)] as const)
    ),
  };
}
