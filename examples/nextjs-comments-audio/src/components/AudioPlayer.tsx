"use client";

import styles from "./AudioPlayer.module.css";
import { ThreadsTimeline } from "@/components/ThreadsTimeline";
import * as Slider from "@radix-ui/react-slider";
import { useCallback, useEffect, useRef, useState } from "react";
import { WaveForm } from "@/components/WaveForm";
import { NewThreadComposer } from "@/components/NewThreadComposer";
import { ClientSideSuspense } from "@liveblocks/react";
import { useUpdateMyPresence } from "@/liveblocks.config";
import { useKeyDownListener, useSkipToListener } from "@/utils";
import { CircularButton } from "@/components/CircularButton";
import { PauseIcon } from "@/icons/Pause";
import { PlayIcon } from "@/icons/Play";
import { Threads } from "@/components/Threads";

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

  useEffect(() => {
    if (!audioRef.current) {
      return;
    }

    const audio = audioRef.current;
    setDuration(audio.duration);

    function updateTime(e: Event) {
      if (!seeking.current) {
        setTime(audio.currentTime);
      }
    }

    function reset() {
      setPlaying(false);
      audio.currentTime = 0;
      audio.pause();
    }

    audio.addEventListener("timeupdate", updateTime);
    audio.addEventListener("ended", reset);

    return () => {
      audio.removeEventListener("timeupdate", updateTime);
      audio.removeEventListener("ended", reset);
    };
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
    <div className={styles.audioWrapper}>
      <div className={styles.playAndInfo}>
        <audio ref={audioRef} src={audioSrc} preload="true"></audio>
        <CircularButton onClick={togglePlay}>
          {playing ? (
            <>
              <span className="sr-only">Pause</span>
              <PauseIcon />
            </>
          ) : (
            <>
              <span className="sr-only">Play</span>
              <PlayIcon />
            </>
          )}
        </CircularButton>{" "}
        <span className={styles.songName}>Song name</span>
      </div>

      <div className={styles.sliderAndComments}>
        {/* Range slider for audio time and waveform */}
        <Slider.Root
          className={styles.sliderRoot}
          min={0}
          max={duration}
          step={1}
          value={[time]}
          onValueChange={handleSliderChange}
          onValueCommit={handleSliderCommit}
        >
          <div className={styles.waveformWrapper}>
            <WaveForm percentage={time / duration} src={audioSrc} />
          </div>
          <Slider.Track>
            <Slider.Range />
            <Slider.Thumb />
          </Slider.Track>
        </Slider.Root>

        {/* Comments on audio timeline */}
        <div className={styles.sliderComments}>
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
