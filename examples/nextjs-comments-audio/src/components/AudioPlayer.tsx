"use client";

import styles from "./AudioPlayer.module.css";
import { ThreadsTimeline } from "@/components/ThreadsTimeline";
import * as Slider from "@radix-ui/react-slider";
import { useCallback, useEffect, useRef, useState } from "react";
import { WaveForm } from "@/components/WaveForm";

const audioSrc = "/titanium-170190.mp3";

export default function AudioPlayer() {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [time, setTime] = useState(0);
  const [playing, setPlaying] = useState(false);
  const seeking = useRef(false);
  const [duration, setDuration] = useState(0);

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

    audio.addEventListener("timeupdate", updateTime);

    return () => {
      audio.removeEventListener("timeupdate", updateTime);
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
  }, []);

  return (
    <div className={styles.audioWrapper}>
      <audio ref={audioRef} src={audioSrc} preload="true"></audio>
      <button onClick={togglePlay}>{playing ? "Pause" : "Play"}</button> | song
      name
      <div className={styles.sliderAndComments}>
        {/* Comments on audio timeline */}
        <div className={styles.sliderComments}>
          <ThreadsTimeline />
        </div>
        {/*<div className={styles.sliderRoot}>*/}
        {/*  <div className={styles.waveformWrapper}>*/}
        {/*    <WaveForm time={time} src={audioSrc} />*/}
        {/*  </div>*/}
        {/*  <input*/}
        {/*    onChange={(e) => handleSliderChange([e.target.value])}*/}
        {/*    type="range"*/}
        {/*    min={0}*/}
        {/*    max={duration}*/}
        {/*    step={0.001}*/}
        {/*  />*/}
        {/*</div>*/}

        {/*Range slider for audio time*/}
        <Slider.Root
          className={styles.sliderRoot}
          min={0}
          max={duration}
          step={0.001}
          value={[time]}
          onValueChange={handleSliderChange}
          onValueCommit={handleSliderCommit}
        >
          <div className={styles.waveformWrapper}>
            <WaveForm percentage={time / duration} src={audioSrc} />
          </div>
          <Slider.Track className={styles.sliderTrack}>
            <Slider.Range className={styles.sliderRange} />
          </Slider.Track>
          <Slider.Thumb className={styles.sliderThumb} />
        </Slider.Root>
      </div>
    </div>
  );
}
