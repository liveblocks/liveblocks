"use client";

import { CircularButton } from "@/components/CircularButton";
import { NewThreadComposer } from "@/components/NewThreadComposer";
import { ThreadsTimeline } from "@/components/ThreadsTimeline";
import { WaveForm } from "@/components/WaveForm";
import { useUpdateMyPresence } from "@/liveblocks.config";
import { useSkipToListener } from "@/utils";
import { ClientSideSuspense } from "@liveblocks/react";
import * as Slider from "@radix-ui/react-slider";
import cx from "classnames";
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

  // Get audio duration
  useEffect(() => {
    if (!audioRef.current) {
      return;
    }

    setDuration(audioRef.current.duration);
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
    <div className="flex flex-col gap-8">
      <div className="flex items-center gap-3">
        <audio
          ref={audioRef}
          src={audioSrc}
          preload="true"
          onTimeUpdate={handleTimeUpdate}
          onEnded={handleEnded}
        />
        <div className="w-full flex flex-col items-center justify-center gap-4">
          <div className="w-2/3 md:w-96 relative aspect-square">
            <span
              className={cx(
                "bg-black rounded-3xl lg:rounded-4xl absolute inset-0 shadow-xl transition-transform ease-out-back duration-500",
                {
                  ["scale-95"]: !playing,
                }
              )}
            />
            <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
              <CircularButton
                onClick={togglePlay}
                size="lg"
                title={playing ? "Pause" : "Play"}
              >
                <span className="sr-only">{playing ? "Pause" : "Play"}</span>
                <PauseIcon
                  className={cx(
                    "absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-transparent fill-black transition duration-300 ease-out-expo",
                    {
                      ["scale-50 opacity-0"]: !playing,
                    }
                  )}
                />
                <PlayIcon
                  className={cx(
                    "absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-transparent fill-black ml-0.5 transition duration-300 ease-out-expo",
                    {
                      ["scale-50 opacity-0"]: playing,
                    }
                  )}
                />
              </CircularButton>
            </span>
          </div>
          <div className="flex flex-col items-center text-center">
            <span className="font-medium text-lg">Midnight Echoes</span>
            <span className="text-secondary">Sophie de Silva & Marco Loom</span>
          </div>
        </div>
      </div>
      <div className="relative h-[--wave-height]">
        {/* Range slider for audio time and waveform */}
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

        {/* Comments on audio timeline */}
        <div className="absolute top-[calc(100%*var(--wave-timeline-modifier))] bottom-0 inset-x-0 pointer-events-none">
          <ThreadsTimeline />
        </div>
      </div>

      {/* Write a comment input */}
      <ClientSideSuspense fallback={null}>
        {() => <NewThreadComposer duration={duration} time={time} />}
      </ClientSideSuspense>
    </div>
  );
}
