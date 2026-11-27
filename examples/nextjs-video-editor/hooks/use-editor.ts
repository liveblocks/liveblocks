"use client";

import { LiveObject, shallow } from "@liveblocks/client";
import {
  useMutation,
  useSelf,
  useStorage,
  useUpdateMyPresence,
} from "@liveblocks/react/suspense";
import { useCallback, useMemo } from "react";
import { getAsset } from "@/lib/media";
import {
  createClip,
  createClipId,
  createTrack,
  MIN_CLIP_DURATION,
  TEXT_STYLES,
  trackAccepts,
  type Clip,
  type ClipLson,
  type ClipType,
  type ProjectLson,
  type TextStyleId,
  type Track,
  type TrackKind,
  type TrackLson,
} from "@/lib/project";
import {
  clipEnd,
  isClipActive,
  maxClipDuration,
  nearestFreeStart,
  neighborBounds,
} from "@/lib/timeline";

export function useProject() {
  return useStorage((root) => root.project);
}

export function useTracks() {
  return useStorage((root) => root.tracks);
}

/** Every clip, as plain JSON. Unchanged clips keep their identity. */
export function useClips() {
  return useStorage((root) => Object.values(root.clips), shallow);
}

export function useClip(clipId: string | undefined) {
  return useStorage((root) => (clipId ? root.clips[clipId] : undefined));
}

export function useSelection() {
  const selectedClipIds = useSelf((me) => me.presence.selectedClipIds);
  const updateMyPresence = useUpdateMyPresence();
  const setSelection = useCallback(
    (selectedClipIds: string[]) => updateMyPresence({ selectedClipIds }),
    [updateMyPresence]
  );
  return [selectedClipIds, setSelection] as const;
}

/** Something that can be put on the timeline from the library. */
export type LibraryItem =
  | { kind: "asset"; assetId: string }
  | { kind: "text"; textStyle: TextStyleId };

export function libraryItemType(item: LibraryItem): ClipType {
  if (item.kind === "text") return "text";
  return getAsset(item.assetId)?.kind === "audio" ? "audio" : "video";
}

export function libraryItemDuration(item: LibraryItem) {
  if (item.kind === "text") {
    return (
      TEXT_STYLES.find((style) => style.id === item.textStyle)?.duration ?? 3
    );
  }
  return getAsset(item.assetId)?.duration ?? 5;
}

function clipFromLibraryItem(
  item: LibraryItem,
  trackId: string,
  start: number
): ClipLson {
  const type = libraryItemType(item);
  const duration = libraryItemDuration(item);
  if (item.kind === "text") {
    const style = TEXT_STYLES.find((style) => style.id === item.textStyle);
    return createClip({
      type,
      trackId,
      start,
      duration,
      text: style?.sample ?? "Text",
      textStyle: item.textStyle,
      font: style?.font ?? "sans",
      fadeIn: 0.4,
      fadeOut: 0.4,
    });
  }
  return createClip({
    type,
    trackId,
    start,
    duration,
    assetId: item.assetId,
  });
}

/**
 * The visual track a new clip goes on by default: one that already holds
 * clips of the same type (so text lands on the titles track and footage on
 * the video track), then any empty one.
 */
function pickTrack(
  tracks: readonly Track[],
  clips: readonly Clip[],
  type: ClipType
) {
  const candidates = tracks.filter(
    (track) => !track.locked && trackAccepts(track, type)
  );
  return (
    candidates.find((track) =>
      clips.some((clip) => clip.trackId === track.id && clip.type === type)
    ) ??
    candidates.find(
      (track) => !clips.some((clip) => clip.trackId === track.id)
    ) ??
    candidates[0]
  );
}

function lockedTrackIds(tracks: readonly Track[]) {
  return new Set(
    tracks.filter((track) => track.locked).map((track) => track.id)
  );
}

/** The selected clips that aren't on locked tracks. */
export function useEditableSelection() {
  const [selection] = useSelection();
  const tracks = useTracks();
  const clips = useClips();
  return useMemo(() => {
    const locked = lockedTrackIds(tracks);
    return selection.filter((id) => {
      const clip = clips.find((clip) => clip.id === id);
      return clip !== undefined && !locked.has(clip.trackId);
    });
  }, [selection, tracks, clips]);
}

export function useEditorActions() {
  const [, setSelection] = useSelection();

  const updateProject = useMutation(
    ({ storage }, patch: Partial<ProjectLson>) => {
      storage.get("project").update(patch);
    },
    []
  );

  const updateClip = useMutation(
    ({ storage }, clipId: string, patch: Partial<ClipLson>) => {
      storage.get("clips").get(clipId)?.update(patch);
    },
    []
  );

  /**
   * Moves a clip as close to `start` on `trackId` as it fits. Placement is
   * checked against current Storage, not what the dragging client last saw,
   * so a collaborator deleting or locking a track, or putting a clip in the
   * way, can't leave this clip overlapping or on a missing track. Returns
   * where the clip landed, or null if it can't move.
   */
  const moveClip = useMutation(
    ({ storage }, clipId: string, trackId: string, start: number) => {
      const clips = storage.get("clips");
      const live = clips.get(clipId);
      if (!live) return null;
      const clip = live.toJSON();
      const tracks = storage.get("tracks").toJSON();
      const current = tracks.find((track) => track.id === clip.trackId);
      if (!current || current.locked) return null;
      const target =
        tracks.find(
          (track) =>
            track.id === trackId &&
            !track.locked &&
            trackAccepts(track, clip.type)
        ) ?? current;
      const others = Array.from(clips.values())
        .map((other) => other.toJSON())
        .filter((other) => other.trackId === target.id && other.id !== clipId);
      const landed = nearestFreeStart(others, start, clip.duration);
      live.update({ start: landed, trackId: target.id });
      return landed;
    },
    []
  );

  /**
   * Moves one edge of a clip to `time`, kept clear of its current neighbors
   * and within its media. Returns where the edge ended up, or null.
   */
  const trimClip = useMutation(
    ({ storage }, clipId: string, edge: "start" | "end", time: number) => {
      const clips = storage.get("clips");
      const live = clips.get(clipId);
      if (!live) return null;
      const clip = live.toJSON();
      const track = storage
        .get("tracks")
        .toJSON()
        .find((track) => track.id === clip.trackId);
      if (!track || track.locked) return null;
      const bounds = neighborBounds(
        Array.from(clips.values())
          .map((other) => other.toJSON())
          .filter(
            (other) => other.trackId === clip.trackId && other.id !== clipId
          ),
        clip
      );

      if (edge === "start") {
        const earliest = Math.max(
          bounds.before,
          clip.type === "text" ? 0 : clip.start - clip.offset
        );
        const start = Math.min(
          clipEnd(clip) - MIN_CLIP_DURATION,
          Math.max(earliest, time)
        );
        const shift = start - clip.start;
        live.update({
          start,
          duration: clip.duration - shift,
          offset: clip.type === "text" ? 0 : clip.offset + shift,
        });
        return start;
      }

      const latest = Math.min(bounds.after, clip.start + maxClipDuration(clip));
      const end = Math.max(
        clip.start + MIN_CLIP_DURATION,
        Math.min(latest, time)
      );
      live.update({ duration: end - clip.start });
      return end;
    },
    []
  );

  const updateTrack = useMutation(
    ({ storage }, trackId: string, patch: Partial<TrackLson>) => {
      storage
        .get("tracks")
        .find((track) => track.get("id") === trackId)
        ?.update(patch);
    },
    []
  );

  const addTrack = useMutation(({ storage }, kind: TrackKind) => {
    const tracks = storage.get("tracks");
    const count = tracks.filter((track) => track.get("kind") === kind).length;
    const track = createTrack(
      kind,
      kind === "visual" ? `Overlay ${count}` : `Audio ${count + 1}`
    );
    // Visual tracks go on top of the stack, audio tracks at the bottom.
    if (kind === "visual") {
      tracks.insert(new LiveObject(track), 0);
    } else {
      tracks.push(new LiveObject(track));
    }
    return track.id;
  }, []);

  const deleteTrack = useMutation(({ storage }, trackId: string) => {
    const tracks = storage.get("tracks");
    const index = tracks.findIndex((track) => track.get("id") === trackId);
    if (index === -1 || tracks.get(index)?.get("locked")) return;
    tracks.delete(index);
    const clips = storage.get("clips");
    for (const [id, clip] of clips) {
      if (clip.get("trackId") === trackId) {
        clips.delete(id);
      }
    }
  }, []);

  /**
   * Puts a library item on the timeline, at `start` on `trackId` when it's
   * dropped there, otherwise at the playhead on the best track for it. It
   * slides to the nearest free spot if something's already there.
   */
  const addLibraryItem = useMutation(
    (
      { storage },
      item: LibraryItem,
      placement: { trackId?: string; start: number; newTrack?: boolean }
    ) => {
      const type = libraryItemType(item);
      const tracks = storage.get("tracks");
      const clips = Array.from(storage.get("clips").values()).map((clip) =>
        clip.toJSON()
      );
      const trackList = tracks.toJSON();
      let track = placement.newTrack
        ? undefined
        : (trackList.find(
            (track) =>
              track.id === placement.trackId &&
              !track.locked &&
              trackAccepts(track, type)
          ) ?? pickTrack(trackList, clips, type));

      if (!track) {
        const kind: TrackKind = type === "audio" ? "audio" : "visual";
        const count = trackList.filter((track) => track.kind === kind).length;
        const created = createTrack(
          kind,
          kind === "visual" ? `Overlay ${count}` : `Audio ${count + 1}`
        );
        if (kind === "visual") {
          tracks.insert(new LiveObject(created), 0);
        } else {
          tracks.push(new LiveObject(created));
        }
        track = created;
      }

      const duration = libraryItemDuration(item);
      const start = nearestFreeStart(
        clips.filter((clip) => clip.trackId === track.id),
        placement.start,
        duration
      );
      const clip = clipFromLibraryItem(item, track.id, start);
      storage.get("clips").set(clip.id, new LiveObject(clip));
      return clip.id;
    },
    []
  );

  const deleteClips = useMutation(({ storage }, clipIds: string[]) => {
    const clips = storage.get("clips");
    const locked = lockedTrackIds(storage.get("tracks").toJSON());
    for (const id of clipIds) {
      const trackId = clips.get(id)?.get("trackId");
      if (trackId !== undefined && !locked.has(trackId)) {
        clips.delete(id);
      }
    }
  }, []);

  /**
   * Cuts clips in two at `time`: the given clips, or, when none are given,
   * every clip under the playhead on an unlocked track.
   */
  const splitClips = useMutation(
    ({ storage }, clipIds: string[], time: number) => {
      const clips = storage.get("clips");
      const locked = lockedTrackIds(storage.get("tracks").toJSON());
      const targets =
        clipIds.length > 0
          ? clipIds
              .map((id) => clips.get(id))
              .filter((clip) => clip !== undefined)
          : Array.from(clips.values()).filter((clip) =>
              isClipActive(clip.toJSON(), time)
            );

      const created: string[] = [];
      for (const live of targets) {
        const clip = live.toJSON();
        if (locked.has(clip.trackId)) continue;
        if (
          time <= clip.start + MIN_CLIP_DURATION ||
          time >= clipEnd(clip) - MIN_CLIP_DURATION
        ) {
          continue;
        }
        const id = createClipId();
        const head = time - clip.start;
        clips.set(
          id,
          new LiveObject({
            ...clip,
            id,
            start: time,
            duration: clip.duration - head,
            offset: clip.type === "text" ? 0 : clip.offset + head,
            fadeIn: 0,
          })
        );
        live.update({ duration: head, fadeOut: 0 });
        created.push(id);
      }
      return created;
    },
    []
  );

  const duplicateClips = useMutation(({ storage }, clipIds: string[]) => {
    const clips = storage.get("clips");
    const locked = lockedTrackIds(storage.get("tracks").toJSON());
    const all = Array.from(clips.values()).map((clip) => clip.toJSON());
    const created: string[] = [];
    for (const clipId of clipIds) {
      const clip = clips.get(clipId)?.toJSON();
      if (!clip || locked.has(clip.trackId)) continue;
      const id = createClipId();
      const start = nearestFreeStart(
        all.filter((other) => other.trackId === clip.trackId),
        clipEnd(clip),
        clip.duration
      );
      const copy: ClipLson = { ...clip, id, start };
      clips.set(id, new LiveObject(copy));
      all.push(copy);
      created.push(id);
    }
    return created;
  }, []);

  return useMemo(
    () => ({
      setSelection,
      updateProject,
      updateClip,
      moveClip,
      trimClip,
      updateTrack,
      addTrack,
      deleteTrack,
      addLibraryItem,
      deleteClips,
      splitClips,
      duplicateClips,
    }),
    [
      setSelection,
      updateProject,
      updateClip,
      moveClip,
      trimClip,
      updateTrack,
      addTrack,
      deleteTrack,
      addLibraryItem,
      deleteClips,
      splitClips,
      duplicateClips,
    ]
  );
}
