"use client";

import dynamic from "next/dynamic";
import {
  CSSProperties,
  PointerEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

const WavesurferPlayer = dynamic(() => import("@wavesurfer/react"), {
  ssr: false,
  loading: () => <div style={{ height: getHeight() }} />,
});

type Props = {
  percentage: number;
  src: string;
};

export function WaveForm({ percentage, src }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const wavesurferRef = useRef<any>(null);
  const [hoverOffset, setHoverOffset] = useState(0);

  useEffect(() => {
    if (!wavesurferRef.current) {
      return;
    }

    wavesurferRef.current.seekTo(percentage);
  }, [percentage]);

  const handlePointerMove = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      if (!containerRef.current) {
        return;
      }

      const left = containerRef.current.getBoundingClientRect().left;
      setHoverOffset(event.clientX - left);
    },
    []
  );

  return (
    <div
      ref={containerRef}
      className="[--hover-percentage:0%] group relative w-full h-[--wave-height] overflow-hidden isolate"
      style={{ "--hover-amount": `${hoverOffset}px` } as CSSProperties}
      onPointerMove={handlePointerMove}
    >
      {/* @ts-ignore */}
      <WavesurferPlayer
        waveColor="#A8A8A8"
        progressColor="#FB233B"
        height={getHeight()}
        barWidth={2}
        barGap={0}
        barRadius={1}
        url={src}
        backend="WebAudio"
        onReady={(ws) => (wavesurferRef.current = ws)}
      />
      <div className="absolute inset-0 h-full opacity-0 lg:group-hover:opacity-100 transition-opacity duration-150 ease-out translate-x-[calc(-100%+var(--hover-amount))] pointer-events-none bg-neutral-50/30 z-10" />
    </div>
  );
}

function getHeight() {
  if (typeof window === "undefined") {
    return 0;
  }

  return parseInt(
    getComputedStyle(
      document.querySelector(":root") as HTMLElement
    ).getPropertyValue("--wave-height")
  );
}
