"use client";

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
    const timelineHeight = parseFloat(
      getComputedStyle(root).getPropertyValue("--wave-timeline-modifier")
    );

    // Define the waveform gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, "#59595B"); // Top color
    gradient.addColorStop(
      (canvas.height * timelineHeight) / canvas.height,
      "#59595B"
    ); // Top color
    gradient.addColorStop(
      (canvas.height * timelineHeight + 3) / canvas.height,
      "#59595B"
    ); // Bottom color
    gradient.addColorStop(1, "#59595B"); // Bottom color

    // Define the progress gradient
    const progressGradient = ctx.createLinearGradient(0, 0, 0, height);
    progressGradient.addColorStop(0, "#FA233B"); // Top color
    progressGradient.addColorStop(
      (canvas.height * timelineHeight) / canvas.height,
      "#FA233B"
    ); // Top color
    progressGradient.addColorStop(
      (canvas.height * timelineHeight + 3) / canvas.height,
      "#FA233B"
    ); // Bottom color
    progressGradient.addColorStop(1, "#FA233B"); // Bottom color

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
    <div
      ref={containerRef}
      className="[--hover-percentage:0%] group relative w-full h-[--wave-height] overflow-hidden isolate"
    >
      <div className="absolute inset-0 h-full opacity-0 lg:group-hover:opacity-80 transition-opacity duration-150 ease-out translate-x-[calc(-100%+var(--hover-amount))] pointer-events-none bg-primary/50 z-10" />
    </div>
  );
}
