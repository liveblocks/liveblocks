import { ORIGINAL_DURATION, WORDS, spanEnd, spanStart } from "./transcript";

/**
 * The edit decision list: which slices of the original recording are kept,
 * in order. Cutting words removes their slices; neighbouring kept slices are
 * merged, so playback and export only have a cut point where words were
 * actually removed.
 */
export type Segment = {
  // Original recording, in seconds.
  start: number;
  end: number;
  // Where the segment starts in the edited episode.
  editedStart: number;
};

export type Timeline = {
  segments: Segment[];
  // Length of the edited episode, in seconds.
  duration: number;
};

export function buildTimeline(isCut: (index: number) => boolean): Timeline {
  const segments: Segment[] = [];
  let duration = 0;

  for (const word of WORDS) {
    if (isCut(word.index)) {
      continue;
    }
    const start = spanStart(word.index);
    const end = spanEnd(word.index);
    const last = segments[segments.length - 1];
    if (last && Math.abs(last.end - start) < 1e-6) {
      last.end = end;
    } else {
      segments.push({ start, end, editedStart: duration });
    }
    duration += end - start;
  }

  return { segments, duration };
}

export const UNEDITED_TIMELINE = buildTimeline(() => false);

/** Index of the last segment starting at or before `time` (original), or -1. */
function segmentIndexAt(timeline: Timeline, time: number) {
  const { segments } = timeline;
  let low = 0;
  let high = segments.length - 1;
  let found = -1;
  while (low <= high) {
    const middle = (low + high) >> 1;
    if (segments[middle].start <= time) {
      found = middle;
      low = middle + 1;
    } else {
      high = middle - 1;
    }
  }
  return found;
}

/**
 * Converts a time in the original recording to the edited episode. Times
 * inside a cut land on the cut point, where playback would resume.
 */
export function toEdited(timeline: Timeline, time: number) {
  const index = segmentIndexAt(timeline, time);
  if (index === -1) {
    return 0;
  }
  const segment = timeline.segments[index];
  if (time < segment.end) {
    return segment.editedStart + (time - segment.start);
  }
  return segment.editedStart + (segment.end - segment.start);
}

/** Converts a time in the edited episode back to the original recording. */
export function toOriginal(timeline: Timeline, edited: number) {
  const { segments } = timeline;
  if (segments.length === 0) {
    return 0;
  }
  let low = 0;
  let high = segments.length - 1;
  while (low < high) {
    const middle = Math.ceil((low + high) / 2);
    if (segments[middle].editedStart <= edited) {
      low = middle;
    } else {
      high = middle - 1;
    }
  }
  const segment = segments[low];
  return Math.min(segment.end, segment.start + (edited - segment.editedStart));
}

/** Moves a time inside a cut forward to where the kept audio resumes. */
export function snapToKept(timeline: Timeline, time: number) {
  const { segments } = timeline;
  const index = segmentIndexAt(timeline, time);
  if (index !== -1 && time < segments[index].end) {
    return time;
  }
  const next = segments[index + 1];
  if (next) {
    return next.start;
  }
  return segments.length > 0 ? segments[segments.length - 1].end : 0;
}

/** Cut points, in edited seconds, for markers on the timeline. */
export function cutPoints(timeline: Timeline) {
  const points: number[] = [];
  const { segments } = timeline;
  for (let index = 0; index < segments.length; index++) {
    const segment = segments[index];
    const previous = segments[index - 1];
    const startsAfterCut = previous
      ? previous.end < segment.start - 1e-6
      : segment.start > 1e-6;
    if (startsAfterCut) {
      points.push(segment.editedStart);
    }
  }
  const last = segments[segments.length - 1];
  if (last && last.end < ORIGINAL_DURATION - 1e-6) {
    points.push(timeline.duration);
  }
  return points;
}
