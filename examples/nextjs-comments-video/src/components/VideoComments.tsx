"use client";

import { ChangeEvent, MouseEvent, useCallback, useRef, useState } from "react";
import ReactPlayer from "react-player";
import { OnProgressProps } from "react-player/base";

export function VideoComments() {
  const player = useRef<ReactPlayer>(null);
  const wrapper = useRef<HTMLDivElement>(null);
  const [playing, setPlaying] = useState(false);
  const [played, setPlayed] = useState(0);
  const [seeking, setSeeking] = useState(false);

  const handleProgress = useCallback(
    (progress: OnProgressProps) => {
      if (!seeking) {
        setPlayed(progress.played);
      }
    },
    [seeking]
  );

  const handleSeekMouseDown = useCallback((e: MouseEvent<HTMLInputElement>) => {
    setSeeking(true);
  }, []);

  const handleSeekChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    setPlayed(parseFloat(e.target.value));
  }, []);

  const handleSeekMouseUp = useCallback((e: MouseEvent<HTMLInputElement>) => {
    setSeeking(false);
    if (player.current) {
      player.current.seekTo(parseFloat((e.target as HTMLInputElement).value));
    }
  }, []);

  const handleFullscreen = useCallback(() => {
    if (!wrapper.current) {
      return;
    }

    const video = wrapper.current.querySelector("video");
    if (!(video instanceof HTMLVideoElement)) {
      return;
    }

    const rfs =
      video.requestFullscreen ||
      (video as any).webkitRequestFullScreen ||
      (video as any).mozRequestFullScreen ||
      (video as any).msRequestFullscreen;
    rfs.call(video);
  }, []);

  return (
    <div>
      <div
        ref={wrapper}
        onClick={() => setPlaying(!playing)}
        onDoubleClick={handleFullscreen}
      >
        <ReactPlayer
          ref={player}
          playing={playing}
          onProgress={handleProgress}
          url="mountain-balloons.mp4"
        />
      </div>
      <button onClick={() => setPlaying(!playing)}>
        {playing ? "pause" : "play"}
      </button>
      <input
        type="range"
        min={0}
        max={0.999999}
        step="any"
        value={played}
        onMouseDown={handleSeekMouseDown}
        onChange={handleSeekChange}
        onMouseUp={handleSeekMouseUp}
      />
      <button onClick={handleFullscreen}>Fullscreen</button>
    </div>
  );
}
