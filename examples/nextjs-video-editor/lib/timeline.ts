import { getAsset } from "./media";
import { FPS, MIN_CLIP_DURATION, type Clip } from "./project";

export function clipEnd(clip: Pick<Clip, "start" | "duration">) {
  return clip.start + clip.duration;
}

export function isClipActive(clip: Clip, time: number) {
  return time >= clip.start && time < clipEnd(clip);
}

/** The length of the edit: where its last clip ends. */
export function projectDuration(clips: Iterable<Clip>) {
  let end = 0;
  for (const clip of clips) {
    end = Math.max(end, clipEnd(clip));
  }
  return end;
}

/**
 * How long a clip can be from its current in point: media clips can't run
 * past the end of their file, text can be any length.
 */
export function maxClipDuration(clip: Pick<Clip, "assetId" | "offset">) {
  const asset = getAsset(clip.assetId);
  return asset ? asset.duration - clip.offset : Infinity;
}

/**
 * The start closest to `desired` where a clip of `duration` fits on a track
 * without overlapping `others`. There's always room after the last clip, so
 * a dragged clip jumps over neighbors instead of getting stuck on them.
 */
export function nearestFreeStart(
  others: readonly Clip[],
  desired: number,
  duration: number
) {
  const sorted = [...others].sort((a, b) => a.start - b.start);
  let best = Math.max(0, desired);
  let bestDistance = Infinity;
  let gapStart = 0;

  for (let i = 0; i <= sorted.length; i++) {
    const gapEnd = i < sorted.length ? sorted[i].start : Infinity;
    if (gapEnd - gapStart >= duration - 1e-6) {
      const candidate = Math.min(
        Math.max(desired, gapStart),
        gapEnd - duration
      );
      const distance = Math.abs(candidate - desired);
      if (distance < bestDistance) {
        best = candidate;
        bestDistance = distance;
      }
    }
    if (i < sorted.length) {
      gapStart = Math.max(gapStart, clipEnd(sorted[i]));
    }
  }

  return best;
}

/** The free space around a clip on its track, for trimming. */
export function neighborBounds(others: readonly Clip[], clip: Clip) {
  let before = 0;
  let after = Infinity;
  for (const other of others) {
    if (clipEnd(other) <= clip.start + 1e-6) {
      before = Math.max(before, clipEnd(other));
    } else if (other.start >= clipEnd(clip) - 1e-6) {
      after = Math.min(after, other.start);
    }
  }
  return { before, after };
}

/**
 * Snaps `time` to the closest of `targets` within `threshold` seconds.
 * Returns the target it snapped to, or null.
 */
export function findSnap(
  times: number[],
  targets: number[],
  threshold: number
): { delta: number; target: number } | null {
  let best: { delta: number; target: number } | null = null;
  for (const time of times) {
    for (const target of targets) {
      const delta = target - time;
      if (
        Math.abs(delta) <= threshold &&
        (!best || Math.abs(delta) < Math.abs(best.delta))
      ) {
        best = { delta, target };
      }
    }
  }
  return best;
}

/** Opacity or gain multiplier from a clip's fades, from 0 to 1. */
export function fadeEnvelope(clip: Clip, time: number) {
  const local = time - clip.start;
  let gain = 1;
  if (clip.fadeIn > 0) {
    gain = Math.min(gain, local / clip.fadeIn);
  }
  if (clip.fadeOut > 0) {
    gain = Math.min(gain, (clip.duration - local) / clip.fadeOut);
  }
  return Math.min(1, Math.max(0, gain));
}

export function snapToFrame(time: number) {
  return Math.round(time * FPS) / FPS;
}

/** `mm:ss:ff`, frames at 30fps, as in a video editor's timecode display. */
export function formatTimecode(time: number) {
  const totalFrames = Math.max(0, Math.round(time * FPS));
  const frames = totalFrames % FPS;
  const seconds = Math.floor(totalFrames / FPS) % 60;
  const minutes = Math.floor(totalFrames / FPS / 60);
  return [minutes, seconds, frames]
    .map((value) => String(value).padStart(2, "0"))
    .join(":");
}

/** `m:ss`, for ruler labels and comment timestamps. */
export function formatTime(time: number) {
  const total = Math.max(0, Math.floor(time + 1e-6));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

/** `4.5s`, for clip lengths. */
export function formatDuration(duration: number) {
  const rounded = Math.round(duration * 10) / 10;
  return `${rounded % 1 === 0 ? rounded.toFixed(0) : rounded.toFixed(1)}s`;
}

const RULER_STEPS = [0.5, 1, 2, 5, 10, 15, 30, 60];

/** Ruler spacing for a zoom level: labelled ticks at least ~72px apart. */
export function rulerStep(pixelsPerSecond: number) {
  const major =
    RULER_STEPS.find((step) => step * pixelsPerSecond >= 72) ??
    RULER_STEPS[RULER_STEPS.length - 1];
  const minor = major <= 1 ? major / 5 : major / (major === 15 ? 3 : 5);
  return { major, minor };
}

export function clampDuration(duration: number, max: number) {
  return Math.min(max, Math.max(MIN_CLIP_DURATION, duration));
}
