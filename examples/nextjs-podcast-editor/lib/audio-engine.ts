import {
  snapToKept,
  toEdited,
  toOriginal,
  UNEDITED_TIMELINE,
  type Timeline,
} from "./timeline";

export type EngineStatus = "loading" | "ready" | "error";

// Short fades at every cut point, so joins don't click.
const FADE = 0.006;
// Scheduling a little ahead of "now" keeps the first segment from clipping.
const START_LATENCY = 0.03;
const PEAKS_PER_SECOND = 100;

/**
 * Plays the edited episode straight from the original recording. Each kept
 * segment is scheduled on the Web Audio clock right after the previous one,
 * so cuts are sample-accurate and gapless, and nothing is ever re-encoded.
 * Positions are always expressed in original seconds, which stay stable
 * while people cut and restore words.
 */
export class AudioEngine {
  status: EngineStatus = "loading";
  // Loudness of the recording, `PEAKS_PER_SECOND` values per second, 0–1.
  peaks: Float32Array | null = null;

  private context: AudioContext | null = null;
  private buffer: AudioBuffer | null = null;
  private timeline: Timeline = UNEDITED_TIMELINE;
  private sources: AudioBufferSourceNode[] = [];
  private playing = false;
  // While paused: where playback will resume. While playing: where it began.
  private position = 0;
  private startedAt = 0;
  private editedFrom = 0;
  private frame = 0;
  private listeners = new Set<() => void>();

  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  private emit() {
    for (const listener of this.listeners) {
      listener();
    }
  }

  async load(url: string) {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Couldn't load ${url}`);
      }
      const data = await response.arrayBuffer();
      // Created suspended; it's resumed on the first play, from a click.
      this.context = new AudioContext();
      this.buffer = await this.context.decodeAudioData(data);
      this.peaks = computePeaks(this.buffer);
      this.status = "ready";
    } catch (error) {
      console.error(error);
      this.status = "error";
    }
    this.emit();
  }

  getStatus = () => this.status;

  isPlaying = () => this.playing;

  getTimeline() {
    return this.timeline;
  }

  /** The playhead, in original seconds. */
  getPosition = () => {
    if (!this.playing || !this.context) {
      return this.position;
    }
    const elapsed = Math.max(0, this.context.currentTime - this.startedAt);
    return toOriginal(this.timeline, this.editedFrom + elapsed);
  };

  /** The playhead, in seconds of the edited episode. */
  getEditedPosition = () => {
    if (!this.playing || !this.context) {
      return toEdited(this.timeline, this.position);
    }
    const elapsed = Math.max(0, this.context.currentTime - this.startedAt);
    return Math.min(this.timeline.duration, this.editedFrom + elapsed);
  };

  /** Called whenever the cuts change, here or from someone else. */
  setTimeline(timeline: Timeline) {
    const position = this.getPosition();
    this.timeline = timeline;
    if (this.playing) {
      this.stopSources();
      this.startFrom(snapToKept(timeline, position));
    } else {
      this.position = position;
      this.emit();
    }
  }

  async play() {
    if (!this.context || !this.buffer || this.playing) {
      return;
    }
    if (this.timeline.duration === 0) {
      return;
    }
    await this.context.resume();
    let from = snapToKept(this.timeline, this.position);
    // At the end: start over.
    if (toEdited(this.timeline, from) >= this.timeline.duration - 0.05) {
      from = toOriginal(this.timeline, 0);
    }
    this.startFrom(from);
  }

  pause() {
    if (!this.playing) {
      return;
    }
    this.position = this.getPosition();
    this.stopSources();
    this.playing = false;
    cancelAnimationFrame(this.frame);
    this.emit();
  }

  toggle() {
    if (this.playing) {
      this.pause();
    } else {
      void this.play();
    }
  }

  /** Moves the playhead to `time`, in original seconds. */
  seek(time: number) {
    if (this.playing) {
      this.stopSources();
      this.startFrom(snapToKept(this.timeline, time));
    } else {
      this.position = time;
      this.emit();
    }
  }

  seekEdited(edited: number) {
    this.seek(toOriginal(this.timeline, edited));
  }

  skip(seconds: number) {
    const edited = this.getEditedPosition() + seconds;
    this.seekEdited(Math.max(0, Math.min(this.timeline.duration, edited)));
  }

  /**
   * Renders the edited episode to a new buffer: the same segments, scheduled
   * on an offline context. Used to export the episode as a WAV file.
   */
  async render(sampleRate = 24000) {
    if (!this.buffer || this.timeline.duration === 0) {
      return null;
    }
    const context = new OfflineAudioContext(
      1,
      Math.ceil(this.timeline.duration * sampleRate),
      sampleRate
    );
    scheduleSegments(context, this.buffer, this.timeline, 0, 0);
    return await context.startRendering();
  }

  destroy() {
    this.pause();
    void this.context?.close();
    this.listeners.clear();
  }

  private startFrom(from: number) {
    if (!this.context || !this.buffer) {
      return;
    }
    const edited = toEdited(this.timeline, from);
    const when = this.context.currentTime + START_LATENCY;
    this.sources = scheduleSegments(
      this.context,
      this.buffer,
      this.timeline,
      edited,
      when
    );
    this.startedAt = when;
    this.editedFrom = edited;
    this.position = from;
    this.playing = true;
    cancelAnimationFrame(this.frame);
    this.frame = requestAnimationFrame(this.tick);
    this.emit();
  }

  private stopSources() {
    for (const source of this.sources) {
      source.onended = null;
      try {
        source.stop();
      } catch {
        // Already stopped.
      }
      source.disconnect();
    }
    this.sources = [];
  }

  private tick = () => {
    if (!this.playing) {
      return;
    }
    if (this.getEditedPosition() >= this.timeline.duration) {
      this.position = toOriginal(this.timeline, this.timeline.duration);
      this.stopSources();
      this.playing = false;
      this.emit();
      return;
    }
    this.emit();
    this.frame = requestAnimationFrame(this.tick);
  };
}

/**
 * Schedules every kept segment from `editedFrom` onwards back to back,
 * starting at `when` on the context's clock.
 */
function scheduleSegments(
  context: BaseAudioContext,
  buffer: AudioBuffer,
  timeline: Timeline,
  editedFrom: number,
  when: number
) {
  const sources: AudioBufferSourceNode[] = [];

  for (const segment of timeline.segments) {
    const length = segment.end - segment.start;
    const editedEnd = segment.editedStart + length;
    if (editedEnd <= editedFrom) {
      continue;
    }
    const skip = Math.max(0, editedFrom - segment.editedStart);
    const duration = length - skip;
    const at = when + (segment.editedStart + skip - editedFrom);

    const gain = context.createGain();
    const fade = Math.min(FADE, duration / 2);
    gain.gain.setValueAtTime(0, at);
    gain.gain.linearRampToValueAtTime(1, at + fade);
    gain.gain.setValueAtTime(1, at + duration - fade);
    gain.gain.linearRampToValueAtTime(0, at + duration);
    gain.connect(context.destination);

    const source = context.createBufferSource();
    source.buffer = buffer;
    source.connect(gain);
    source.start(at, segment.start + skip, duration);
    source.onended = () => gain.disconnect();
    sources.push(source);
  }

  return sources;
}

function computePeaks(buffer: AudioBuffer) {
  const samples = buffer.getChannelData(0);
  const size = Math.max(1, Math.floor(buffer.sampleRate / PEAKS_PER_SECOND));
  const peaks = new Float32Array(Math.ceil(samples.length / size));
  let max = 0;
  for (let index = 0; index < peaks.length; index++) {
    let sum = 0;
    const from = index * size;
    const to = Math.min(samples.length, from + size);
    for (let sample = from; sample < to; sample++) {
      sum += samples[sample] * samples[sample];
    }
    const rms = Math.sqrt(sum / Math.max(1, to - from));
    peaks[index] = rms;
    max = Math.max(max, rms);
  }
  if (max > 0) {
    for (let index = 0; index < peaks.length; index++) {
      // A gentle curve so quiet syllables still show up.
      peaks[index] = Math.pow(peaks[index] / max, 0.7);
    }
  }
  return peaks;
}

/** Loudness (0–1) of the recording around `time`, in original seconds. */
export function peakAt(peaks: Float32Array, time: number) {
  const index = Math.floor(time * PEAKS_PER_SECOND);
  return peaks[Math.max(0, Math.min(peaks.length - 1, index))] ?? 0;
}

/** Loudest point of the recording between two original times. */
export function peakBetween(peaks: Float32Array, from: number, to: number) {
  const start = Math.max(0, Math.floor(from * PEAKS_PER_SECOND));
  const end = Math.min(peaks.length - 1, Math.ceil(to * PEAKS_PER_SECOND));
  let max = 0;
  for (let index = start; index <= end; index++) {
    max = Math.max(max, peaks[index]);
  }
  return max;
}
