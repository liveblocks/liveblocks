"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import ReactPlayer from "react-player";
import { OnProgressProps } from "react-player/base";
import * as Slider from "@radix-ui/react-slider";
import styles from "./VideoPlayer.module.css";
import { PlayIcon } from "@/icons/Play";
import { PauseIcon } from "@/icons/Pause";
import { FullscreenIcon } from "@/icons/Fullscreen";
import Duration from "@/components/Duration";
import { ClientSideSuspense } from "@liveblocks/react";
import { ThreadsTimeline } from "@/components/ThreadsTimeline";
import { NewThreadComposer } from "@/components/NewThreadComposer";
import { ExitFullscreenIcon } from "@/icons/ExitFullscreen";
import { useUpdateMyPresence } from "@liveblocks/react/suspense";
import { useKeyDownListener, useSkipToListener } from "@/utils";

export function VideoPlayer() {
  const player = useRef<ReactPlayer>(null);
  const playerWrapper = useRef(null);
  const playerClickWrapper = useRef<HTMLDivElement>(null);

  const [time, setTime] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [seeking, setSeeking] = useState(false);
  const [duration, setDuration] = useState(0);
  const [fullscreen, setFullscreen] = useState(false);

  const updateMyPresence = useUpdateMyPresence();

  // Update multiplayer presence to show current state
  useEffect(() => {
    if (seeking) {
      updateMyPresence({ state: "seeking" });
      return;
    }

    updateMyPresence({ state: playing ? "playing" : "paused" });
  }, [playing, seeking]);

  // When playing, but not seeking, update UI time value for slider
  const handleProgress = useCallback(
    (progress: OnProgressProps) => {
      if (!seeking) {
        setTime(progress.played);
      }
    },
    [seeking]
  );

  // Stop playing on video end
  const handleEnded = useCallback(() => {
    setPlaying(false);
  }, []);

  // Toggle fullscreen
  const handleFullscreen = useCallback(() => {
    if (!playerWrapper.current) {
      return;
    }

    if (fullscreen) {
      exitFullscreen();
      setFullscreen(false);
      return;
    }

    setFullscreen(requestFullscreen(playerWrapper.current));
  }, [fullscreen]);

  // On seek, update UI time
  const handleSliderChange = useCallback(([value]: [number]) => {
    setSeeking(true);
    setTime(value);
  }, []);

  // On end seeking, update UI time and update video time
  const handleSliderCommit = useCallback(([value]: [number]) => {
    setTime(value);
    if (player.current) {
      player.current.seekTo(value);
    }
    setSeeking(false);
  }, []);

  // Get current percentage through video, for thread metadata
  const getCurrentPercentage = useCallback(() => {
    const time = player?.current?.getCurrentTime();

    if (time === 0) {
      return 0;
    }

    if (!time || !player.current) {
      return -1;
    }

    return (time / duration) * 100;
  }, [duration]);

  // Listen to skip events from other parts of app
  useSkipToListener((timePercentage) => {
    if (!player.current) {
      return;
    }

    const newTime = timePercentage / 100;
    setSeeking(false);
    setPlaying(false);
    setTime(newTime);
    player.current.seekTo(newTime);
  });

  // Listen for keyboard events
  useKeyDownListener((event) => {
    if (event.code === "Space") {
      setPlaying(!playing);
      return;
    }

    if (event.code === "KeyF") {
      handleFullscreen();
      return;
    }
  });

  return (
    <div className={styles.videoPlayer}>
      <div className={styles.playerWrapper} ref={playerWrapper}>
        {/* Video player */}
        <div
          ref={playerClickWrapper}
          className={styles.playerClickWrapper}
          onClick={() => setPlaying(!playing)}
          onDoubleClick={handleFullscreen}
        >
          <ClientSideSuspense fallback={null}>
            <ReactPlayer
              ref={player}
              width="100%"
              height="auto"
              playing={playing}
              onDuration={setDuration}
              onProgress={handleProgress}
              onEnded={handleEnded}
              url="michael-james-16296843-720p.mp4"
              className={styles.reactPlayer}
            />
          </ClientSideSuspense>
        </div>

        {/* Video controls */}
        <div className={styles.controls}>
          <button
            className={styles.playButton}
            onClick={() => setPlaying(!playing)}
          >
            {playing ? <PauseIcon /> : <PlayIcon />}
          </button>
          {player.current ? (
            <div className={styles.time}>
              <Duration seconds={duration * time} /> /{" "}
              <Duration seconds={duration} />
            </div>
          ) : null}
          <button
            className={styles.fullscreenButton}
            onClick={handleFullscreen}
          >
            {fullscreen ? <ExitFullscreenIcon /> : <FullscreenIcon />}
          </button>
        </div>

        <div className={styles.sliderAndComments}>
          {/* Comments on video timeline */}
          <div className={styles.sliderComments}>
            <ThreadsTimeline />
          </div>

          {/* Range slider for video time */}
          <Slider.Root
            className={styles.sliderRoot}
            min={0}
            max={0.999999}
            step={0.001}
            value={[time]}
            onValueChange={handleSliderChange}
            onValueCommit={handleSliderCommit}
          >
            <Slider.Track className={styles.sliderTrack}>
              <Slider.Range className={styles.sliderRange} />
            </Slider.Track>
            <Slider.Thumb className={styles.sliderThumb} />
          </Slider.Root>
        </div>
      </div>

      {/* Add comment component */}
      <ClientSideSuspense fallback={null}>
        <NewThreadComposer
          getCurrentPercentage={getCurrentPercentage}
          setPlaying={setPlaying}
          time={duration * time}
        />
      </ClientSideSuspense>
    </div>
  );
}

function requestFullscreen(element: HTMLElement | null) {
  if (!(element instanceof HTMLElement)) {
    return false;
  }

  const rfs =
    element.requestFullscreen ||
    (element as any).webkitRequestFullScreen ||
    (element as any).mozRequestFullScreen ||
    (element as any).msRequestFullscreen;
  rfs.call(element);

  return true;
}

function exitFullscreen() {
  if (document.fullscreenElement === null) {
    return;
  }

  document.exitFullscreen();
}
