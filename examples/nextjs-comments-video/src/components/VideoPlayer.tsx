"use client";

import { useCallback, useRef, useState } from "react";
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
import { Simulate } from "react-dom/test-utils";
import play = Simulate.play;
import { ExitFullscreenIcon } from "@/icons/ExitFullscreen";

export function VideoPlayer() {
  const player = useRef<ReactPlayer>(null);
  const playerWrapper = useRef(null);
  const playerClickWrapper = useRef<HTMLDivElement>(null);

  const [playing, setPlaying] = useState(false);
  const [played, setPlayed] = useState(0);
  const [seeking, setSeeking] = useState(false);
  const [duration, setDuration] = useState(0);
  const [fullscreen, setFullscreen] = useState(false);

  const handleProgress = useCallback(
    (progress: OnProgressProps) => {
      if (!seeking) {
        setPlayed(progress.played);
      }
    },
    [seeking]
  );

  const handleEnded = useCallback(() => {
    setPlaying(false);
  }, []);

  const handleFullscreen = useCallback(() => {
    if (!playerWrapper.current) {
      return;
    }

    if (fullscreen) {
      document.exitFullscreen();
      setFullscreen(false);
      return;
    }

    setFullscreen(requestFullscreen(playerWrapper.current));
  }, [fullscreen]);

  const handleSliderChange = useCallback(([value]: [number]) => {
    setSeeking(true);
    setPlayed(value);
  }, []);

  const handleSliderCommit = useCallback(([value]: [number]) => {
    setPlayed(value);
    if (player.current) {
      player.current.seekTo(value);
    }
    setSeeking(false);
  }, []);

  const getCurrentPercentage = useCallback(() => {
    const time = player?.current?.getCurrentTime();

    if (time === 0) {
      return 0;
    }

    if (!time || !player.current) {
      return -1;
    }

    return (player.current.getCurrentTime() / duration) * 100;
  }, [duration]);

  return (
    <div className={styles.videoPlayer}>
      <div className={styles.playerWrapper} ref={playerWrapper}>
        <div
          ref={playerClickWrapper}
          onClick={() => setPlaying(!playing)}
          onDoubleClick={handleFullscreen}
        >
          <ClientSideSuspense fallback={null}>
            {() => (
              <ReactPlayer
                ref={player}
                width="100%"
                height="auto"
                playing={playing}
                onDuration={setDuration}
                onProgress={handleProgress}
                onEnded={handleEnded}
                url="mountain-balloons.mp4"
                className={styles.reactPlayer}
              />
            )}
          </ClientSideSuspense>
        </div>

        <div className={styles.controls}>
          <button
            className={styles.playButton}
            onClick={() => setPlaying(!playing)}
          >
            {playing ? <PauseIcon /> : <PlayIcon />}
          </button>
          {player.current ? (
            <div className={styles.time}>
              <Duration seconds={duration * played} /> /{" "}
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
          <div className={styles.sliderComments}>
            <ThreadsTimeline />
          </div>

          <Slider.Root
            className={styles.sliderRoot}
            min={0}
            max={0.999999}
            step={0.001}
            value={[played]}
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

      <NewThreadComposer getCurrentPercentage={getCurrentPercentage} />
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
