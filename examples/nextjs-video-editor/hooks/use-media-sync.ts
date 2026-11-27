"use client";

import { useEffect, useRef, type RefObject } from "react";
import { FPS } from "@/lib/project";

// While playing, media runs on its own clock and is only corrected when it
// drifts this far from the playhead, so playback stays smooth.
const MAX_DRIFT = 0.25;

/**
 * Keeps a `<video>` or `<audio>` element in step with the playback clock.
 * `target` is where the element should be in its file right now; while the
 * clip is coming up, the element is parked on its first frame (`cue`) so it
 * starts without a stall.
 */
export function useMediaSync(
  ref: RefObject<HTMLMediaElement | null>,
  {
    active,
    playing,
    target,
    cue,
  }: { active: boolean; playing: boolean; target: number; cue: number | null }
) {
  const latest = useRef({ active, playing, target });

  useEffect(() => {
    latest.current = { active, playing, target };
    const media = ref.current;
    if (!media) return;

    if (!active) {
      if (!media.paused) media.pause();
      if (
        cue !== null &&
        !media.seeking &&
        Math.abs(media.currentTime - cue) > 0.05
      ) {
        media.currentTime = cue;
      }
      return;
    }

    if (playing) {
      if (media.paused) {
        if (Math.abs(media.currentTime - target) > 0.05) {
          media.currentTime = target;
        }
        void media.play().catch(() => {});
      } else if (Math.abs(media.currentTime - target) > MAX_DRIFT) {
        media.currentTime = target;
      }
      return;
    }

    if (!media.paused) media.pause();
    if (!media.seeking && Math.abs(media.currentTime - target) > 0.5 / FPS) {
      media.currentTime = target;
    }
  }, [ref, active, playing, target, cue]);

  // Scrubbing can outpace seeking: once a seek lands, catch up with wherever
  // the playhead is now.
  useEffect(() => {
    const media = ref.current;
    if (!media) return;
    const onSeeked = () => {
      const { active, playing, target } = latest.current;
      if (
        active &&
        !playing &&
        Math.abs(media.currentTime - target) > 0.5 / FPS
      ) {
        media.currentTime = target;
      }
    };
    media.addEventListener("seeked", onSeeked);
    return () => media.removeEventListener("seeked", onSeeked);
  }, [ref]);
}
