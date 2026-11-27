"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { Playback } from "@/lib/playback";

const PlaybackContext = createContext<Playback | null>(null);

export function PlaybackProvider({ children }: { children: ReactNode }) {
  const [playback] = useState(() => new Playback());
  useEffect(() => () => playback.destroy(), [playback]);
  return (
    <PlaybackContext.Provider value={playback}>
      {children}
    </PlaybackContext.Provider>
  );
}

export function usePlayback() {
  const playback = useContext(PlaybackContext);
  if (!playback) {
    throw new Error("usePlayback must be used inside PlaybackProvider");
  }
  return playback;
}

/** The current time, re-rendering on every frame while playing. */
export function usePlaybackTime() {
  const playback = usePlayback();
  return useSyncExternalStore(
    playback.subscribe,
    () => playback.time,
    () => 0
  );
}

export function usePlaybackPlaying() {
  const playback = usePlayback();
  return useSyncExternalStore(
    playback.subscribe,
    () => playback.playing,
    () => false
  );
}

export function usePlaybackDuration() {
  const playback = usePlayback();
  return useSyncExternalStore(
    playback.subscribe,
    () => playback.duration,
    () => 0
  );
}

export function usePlaybackLoop() {
  const playback = usePlayback();
  return useSyncExternalStore(
    playback.subscribe,
    () => playback.loop,
    () => false
  );
}
