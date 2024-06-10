"use client";

import { NewThreadComposer } from "@/components/NewThreadComposer";
import { ThreadsTimeline } from "@/components/ThreadsTimeline";
import { WaveForm } from "@/components/WaveForm";
import { useUpdateMyPresence } from "@liveblocks/react/suspense";
import { useSkipToListener } from "@/utils";
import { ClientSideSuspense } from "@liveblocks/react";
import * as Slider from "@radix-ui/react-slider";
import cx from "classnames";
import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { Pause as PauseIcon, Play as PlayIcon } from "react-feather";

const audioSrc = "/titanium-170190.mp3";

export function AudioPlayer() {
  const updateMyPresence = useUpdateMyPresence();
  const audioRef = useRef<HTMLAudioElement>(null);
  const [time, setTime] = useState(0);
  const [playing, setPlaying] = useState(false);
  const seeking = useRef(false);
  const [duration, setDuration] = useState(0);

  // Update multiplayer presence to show current state
  useEffect(() => {
    updateMyPresence({ state: playing ? "playing" : "paused" });
  }, [playing]);

  // Set duration if audio has loaded
  const setAudioDuration = useCallback(() => {
    if (!audioRef.current) {
      return;
    }

    if (!Number.isNaN(audioRef.current.duration)) {
      setDuration(audioRef.current.duration);
    }
  }, []);

  // If audio loaded before component, set duration immediately
  useEffect(() => {
    setAudioDuration();
  }, []);

  // Update `time` as audio progresses, but not when seeking
  const handleTimeUpdate = useCallback(() => {
    if (!audioRef.current) {
      return;
    }

    if (!seeking.current) {
      setTime(audioRef.current.currentTime);
    }
  }, []);

  // On audio end, reset
  const handleEnded = useCallback(() => {
    if (!audioRef.current) {
      return;
    }

    setPlaying(false);
    audioRef.current.currentTime = 0;
    audioRef.current.pause();
  }, []);

  // Toggle play/pause
  const togglePlay = useCallback(() => {
    if (!audioRef.current) {
      return null;
    }

    if (playing) {
      audioRef.current.pause();
      setPlaying(false);
    } else {
      audioRef.current.play();
      setPlaying(true);
    }
  }, [playing]);

  // On seek, update UI time
  const handleSliderChange = useCallback(([value]: [number]) => {
    if (!audioRef.current) {
      return;
    }

    seeking.current = true;
    setTime(value);
  }, []);

  // On end seeking, update UI time and update audio time
  const handleSliderCommit = useCallback(([value]: [number]) => {
    if (!audioRef.current) {
      return;
    }

    seeking.current = false;
    setTime(value);
    setPlaying(true);
    audioRef.current.currentTime = value;
    audioRef.current.play();
  }, []);

  // Listen to skip events from other parts of app
  useSkipToListener((newTime) => {
    if (!audioRef.current) {
      return;
    }

    seeking.current = false;
    setPlaying(true);
    setTime(newTime);
    audioRef.current.currentTime = newTime;
    audioRef.current.play();
  });

  return (
    <div className="flex flex-col gap-8 sm:gap-10">
      <div className="flex items-center gap-3">
        <audio
          ref={audioRef}
          src={audioSrc}
          preload="true"
          onLoadedMetadata={setAudioDuration}
          onTimeUpdate={handleTimeUpdate}
          onEnded={handleEnded}
        />
        <div className="w-full flex flex-col items-center justify-center gap-4">
          <div
            className={cx(
              "relative bg-neutral-900 w-2/3 md:w-96 aspect-square rounded-3xl overflow-hidden transition-transform ease-out-back duration-300 shadow-2xl after:absolute after:inset-0 after:rounded-[inherit] after:bg-gradient-to-br after:from-transparent after:via-white/5 after:pointer-events-none after:to-transparent",
              {
                ["scale-95"]: !playing,
              }
            )}
          >
            <div className="scale-75">
              <Image
                className="rounded-full animate-spin-slow select-none"
                style={{
                  animationPlayState: playing ? "running" : "paused",
                }}
                src="/cover.svg"
                width={384}
                height={384}
                alt=""
              />
            </div>
            <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
              <button
                type="button"
                className="size-14 sm:size-16 bg-white shadow-xl rounded-full hover:scale-105 transition-transform ease-out-expo duration-500"
                onClick={togglePlay}
                title={playing ? "Pause" : "Play"}
              >
                <span className="sr-only">{playing ? "Pause" : "Play"}</span>
                <PauseIcon
                  className={cx(
                    "absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-transparent fill-neutral-900 transition duration-300 ease-out-expo",
                    {
                      ["scale-50 opacity-0"]: !playing,
                    }
                  )}
                />
                <PlayIcon
                  className={cx(
                    "absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-transparent fill-neutral-900 ml-0.5 transition duration-300 ease-out-expo",
                    {
                      ["scale-50 opacity-0"]: playing,
                    }
                  )}
                />
              </button>
            </span>
          </div>
          <div className="flex flex-col items-center text-center">
            <span className="font-medium text-lg">The Velvet Whispers</span>
            <span className="text-neutral-600">Ephemeral Echoes</span>
          </div>
        </div>
      </div>
      <div className="relative h-[--wave-height]">
        {/* Range slider for audio time and waveform */}
        {duration ? (
          <Slider.Root
            className="relative flex-1 flex items-center select-none touch-none w-full h-full"
            min={0}
            max={duration}
            step={1}
            value={[time]}
            onValueChange={handleSliderChange}
            onValueCommit={handleSliderCommit}
          >
            <div className="absolute inset-0">
              <WaveForm percentage={time / duration} src={audioSrc} />
            </div>
            <Slider.Track>
              <Slider.Range />
              <Slider.Thumb />
            </Slider.Track>
          </Slider.Root>
        ) : null}

        {/* Comments on audio timeline */}
        <div className="absolute top-[calc(100%*var(--wave-timeline-modifier))] bottom-0 inset-x-0 pointer-events-none">
          <ThreadsTimeline />
        </div>
      </div>

      {/* Write a comment input */}
      <ClientSideSuspense fallback={null}>
        <NewThreadComposer duration={duration} time={time} />
      </ClientSideSuspense>
    </div>
  );
}
