import waveforms from "./waveforms.json";

/**
 * The media library. Files are served from `public/media`: short 360p clips
 * (stock footage from Pexels), synthesized audio, and for each video a strip
 * of 10 thumbnails spread evenly over its length, used for the timeline's
 * filmstrips and for scrubbing previews in the library.
 */

export type VideoAsset = {
  kind: "video";
  id: string;
  name: string;
  src: string;
  frames: string;
  duration: number;
};

export type AudioAsset = {
  kind: "audio";
  id: string;
  name: string;
  description: string;
  src: string;
  duration: number;
  // Loudness of the file, 20 values per second, from 0 to 1.
  peaks: number[];
};

export type Asset = VideoAsset | AudioAsset;

export const FRAME_COUNT = 10;
export const FRAME_ASPECT = 16 / 9;

function video(id: string, name: string): VideoAsset {
  return {
    kind: "video",
    id,
    name,
    src: `/media/${id}.mp4`,
    frames: `/media/${id}-frames.jpg`,
    duration: 8,
  };
}

function audio(
  id: keyof typeof waveforms,
  name: string,
  description: string
): AudioAsset {
  return {
    kind: "audio",
    id,
    name,
    description,
    src: `/media/${id}.mp3`,
    duration: waveforms[id].duration,
    peaks: waveforms[id].peaks,
  };
}

export const VIDEO_ASSETS: VideoAsset[] = [
  video("reef", "Turquoise reef"),
  video("surf", "Surf break"),
  video("bay", "Hidden bay"),
  video("fields", "Rice fields"),
  video("shoreline", "Shoreline"),
  video("sunset", "Golden hour pier"),
  video("lagoon", "Lagoon"),
  video("village", "Beach village"),
];

export const AUDIO_ASSETS: AudioAsset[] = [
  audio("music", "Drift", "Lo-fi · 92 BPM"),
  audio("waves", "Ocean waves", "Ambience"),
  audio("whoosh", "Whoosh", "Transition"),
];

const ASSETS = new Map<string, Asset>(
  [...VIDEO_ASSETS, ...AUDIO_ASSETS].map((asset) => [asset.id, asset])
);

export function getAsset(id: string | null) {
  return id ? ASSETS.get(id) : undefined;
}

/** Index of the thumbnail closest to `time` seconds into a video. */
export function frameIndexAt(asset: VideoAsset, time: number) {
  const index = Math.floor((time / asset.duration) * FRAME_COUNT);
  return Math.min(FRAME_COUNT - 1, Math.max(0, index));
}
