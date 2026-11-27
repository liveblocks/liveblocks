import { memo } from "react";

const PEAKS_PER_SECOND = 20;

/**
 * An audio waveform drawn as mirrored bars, stretched to fill its box. Pass
 * `from` and `to` (in seconds) to draw only part of the file.
 */
export const Waveform = memo(function Waveform({
  peaks,
  from = 0,
  to,
  className,
}: {
  peaks: number[];
  from?: number;
  to?: number;
  className?: string;
}) {
  const start = Math.max(0, Math.floor(from * PEAKS_PER_SECOND));
  const end =
    to === undefined
      ? peaks.length
      : Math.min(peaks.length, Math.ceil(to * PEAKS_PER_SECOND));
  const slice = peaks.slice(start, Math.max(start + 1, end));

  let d = "";
  slice.forEach((peak, index) => {
    const height = Math.max(0.06, Math.min(1, peak));
    d += `M${index + 0.18} ${(1 - height) / 2}h0.64v${height}h-0.64Z`;
  });

  return (
    <svg
      viewBox={`0 0 ${slice.length} 1`}
      preserveAspectRatio="none"
      className={className}
      aria-hidden
    >
      <path d={d} fill="currentColor" />
    </svg>
  );
});
