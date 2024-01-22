"use client";
import styles from "./WaveForm.module.css";

import { useEffect, useRef } from "react";
import WaveSurfer from "wavesurfer.js";

type Props = {
  percentage: number;
  src: string;
};

const height = 70;

export function WaveForm({ percentage, src }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const wavesurfer = useRef<WaveSurfer>();

  useEffect(() => {
    const container = containerRef.current;
    const root = document.querySelector(":root");
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    if (!root || !ctx || !container) {
      return;
    }

    const height = parseInt(
      getComputedStyle(root).getPropertyValue("--wave-height")
    );

    // Define the waveform gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, "#807f7f"); // Top color
    gradient.addColorStop((canvas.height * 0.5) / canvas.height, "#807f7f"); // Top color
    gradient.addColorStop((canvas.height * 0.5 + 1) / canvas.height, "white"); // White line
    gradient.addColorStop((canvas.height * 0.5 + 2) / canvas.height, "white"); // White line
    gradient.addColorStop((canvas.height * 0.5 + 3) / canvas.height, "#B1B1B1"); // Bottom color
    gradient.addColorStop(1, "#B1B1B1"); // Bottom color

    // Define the progress gradient
    const progressGradient = ctx.createLinearGradient(0, 0, 0, height);
    progressGradient.addColorStop(0, "#EE772F"); // Top color
    progressGradient.addColorStop(
      (canvas.height * 0.5) / canvas.height,
      "#ff0000"
    ); // Top color
    progressGradient.addColorStop(
      (canvas.height * 0.5 + 1) / canvas.height,
      "#ffffff"
    ); // White line
    progressGradient.addColorStop(
      (canvas.height * 0.5 + 2) / canvas.height,
      "#ffffff"
    ); // White line
    progressGradient.addColorStop(
      (canvas.height * 0.5 + 3) / canvas.height,
      "#F6B094"
    ); // Bottom color
    progressGradient.addColorStop(1, "#F6B094"); // Bottom color

    // Create the waveform
    wavesurfer.current = WaveSurfer.create({
      container,
      waveColor: gradient,
      progressColor: progressGradient,
      height,
      barWidth: 2,
      barGap: 0,
      barRadius: 1,
      url: src,
      backend: "WebAudio",
    });

    function hover(e: PointerEvent) {
      if (!containerRef.current) {
        return;
      }

      containerRef.current.style.setProperty(
        "--hover-amount",
        `${e.offsetX}px`
      );
    }

    container.addEventListener("pointermove", hover);

    return () => {
      if (!wavesurfer.current || !container) {
        return;
      }

      container.removeEventListener("pointermove", hover);
      wavesurfer.current.destroy();
    };
  }, []);

  useEffect(() => {
    if (!wavesurfer.current) {
      return;
    }

    wavesurfer.current?.seekTo(percentage);
  }, [percentage]);

  return (
    <div ref={containerRef} className={styles.waveform}>
      <div className={styles.waveformHover} />
    </div>
  );
}
