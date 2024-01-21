"use client";

import { useEffect, useRef } from "react";
import WaveSurfer from "wavesurfer.js";

type Props = {
  time: number;
  src: string;
};

const height = 70;

export function WaveForm({ time, src }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const wavesurfer = useRef<WaveSurfer>();

  useEffect(() => {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    if (!ctx || !containerRef.current) {
      return;
    }

    // Define the waveform gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height * 1.35);
    gradient.addColorStop(0, "#807f7f"); // Top color
    gradient.addColorStop((canvas.height * 0.7) / canvas.height, "#807f7f"); // Top color
    gradient.addColorStop((canvas.height * 0.7 + 1) / canvas.height, "#ffffff"); // White line
    gradient.addColorStop((canvas.height * 0.7 + 2) / canvas.height, "#ffffff"); // White line
    gradient.addColorStop((canvas.height * 0.7 + 3) / canvas.height, "#B1B1B1"); // Bottom color
    gradient.addColorStop(1, "#B1B1B1"); // Bottom color

    // Define the progress gradient
    const progressGradient = ctx.createLinearGradient(
      0,
      0,
      0,
      canvas.height * 1.35
    );
    progressGradient.addColorStop(0, "#EE772F"); // Top color
    progressGradient.addColorStop(
      (canvas.height * 0.7) / canvas.height,
      "#EB4926"
    ); // Top color
    progressGradient.addColorStop(
      (canvas.height * 0.7 + 1) / canvas.height,
      "#ffffff"
    ); // White line
    progressGradient.addColorStop(
      (canvas.height * 0.7 + 2) / canvas.height,
      "#ffffff"
    ); // White line
    progressGradient.addColorStop(
      (canvas.height * 0.7 + 3) / canvas.height,
      "#F6B094"
    ); // Bottom color
    progressGradient.addColorStop(1, "#F6B094"); // Bottom color

    // Create the waveform
    wavesurfer.current = WaveSurfer.create({
      container: containerRef.current,
      waveColor: gradient,
      progressColor: progressGradient,
      height: height,
      barWidth: 2,
      url: src,
      backend: "WebAudio",
    });

    return () => {
      if (!wavesurfer.current) {
        return;
      }

      wavesurfer.current.destroy();
    };
  }, []);

  useEffect(() => {
    if (!wavesurfer.current) {
      return;
    }

    wavesurfer.current?.seekTo(time);
  }, [time]);

  return (
    <div
      ref={containerRef}
      style={{ position: "relative", width: "100%", height: `${height}px` }}
    />
  );
}
