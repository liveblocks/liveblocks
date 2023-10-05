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
import { Loading } from "@/components/Loading";

export function VideoPlayer() {
  const player = useRef<ReactPlayer>(null);
  const playerClickWrapper = useRef<HTMLDivElement>(null);
  const [playing, setPlaying] = useState(false);
  const [played, setPlayed] = useState(0);
  const [seeking, setSeeking] = useState(false);
  const [duration, setDuration] = useState(0);

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
    if (!playerClickWrapper.current) {
      return;
    }

    const video = playerClickWrapper.current.querySelector("video");
    requestFullscreen(video);
  }, []);

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

  return (
    <div className={styles.videoPlayer}>
      <div className={styles.playerWrapper}>
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
        <Slider.Root
          className={styles.sliderRoot}
          min={0}
          max={0.999999}
          step={0.0001}
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
        <button className={styles.fullscreenButton} onClick={handleFullscreen}>
          <FullscreenIcon />
        </button>
      </div>
    </div>
  );
}

function requestFullscreen(video: Element | null) {
  if (!(video instanceof HTMLVideoElement)) {
    return false;
  }

  const rfs =
    video.requestFullscreen ||
    (video as any).webkitRequestFullScreen ||
    (video as any).mozRequestFullScreen ||
    (video as any).msRequestFullscreen;
  rfs.call(video);

  return true;
}
