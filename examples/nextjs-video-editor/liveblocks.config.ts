import type { LiveList, LiveMap, LiveObject } from "@liveblocks/client";
import type { ClipLson, ProjectLson, TrackLson } from "./lib/project";

declare global {
  interface Liveblocks {
    // Custom user info set when authenticating with a secret key
    UserMeta: {
      id: string;
      info: {
        // Example properties, for useSelf, useUser, useOthers, etc.
        name: string;
        avatar: string;
        color: string;
      };
    };

    // Realtime presence, shared with everyone editing the project: where
    // their playhead is (and whether they're playing), which clips they have
    // selected, and their cursor over the timeline. The cursor is stored in
    // timeline coordinates (seconds, and pixels from the top of the tracks)
    // so it lands on the same moment for everyone, whatever their zoom level.
    Presence: {
      playhead: number;
      playing: boolean;
      selectedClipIds: string[];
      cursor: { time: number; y: number } | null;
    };

    // The whole edit lives in Storage. Tracks are ordered top to bottom (the
    // top visual track is drawn over the ones below it in the preview), and
    // clips are kept in a map keyed by id, each pointing at its track, so
    // moving a clip between tracks is a single field change.
    Storage: {
      project: LiveObject<ProjectLson>;
      tracks: LiveList<LiveObject<TrackLson>>;
      clips: LiveMap<string, LiveObject<ClipLson>>;
    };

    // Comments are threads pinned to a moment of the video, in seconds.
    ThreadMetadata: {
      time: number;
    };
  }
}

export {};
