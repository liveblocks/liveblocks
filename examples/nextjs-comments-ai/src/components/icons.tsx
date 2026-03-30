export function ChevronIcon({
  rotate = false,
  size = 17,
}: {
  rotate?: boolean;
  size?: number;
}) {
  return (
    <svg
      className={`relative top-0.5 ${rotate ? "rotate-180" : ""}`}
      width={size}
      height={size}
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      role="presentation"
    >
      <path d="M14.5 8.5 10 13 5.5 8.5"></path>
    </svg>
  );
}

export function BrainIcon() {
  return (
    <svg
      className="comments-ai-spinner"
      width={17}
      height={17}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 18V5M15 13a4.17 4.17 0 01-3-4 4.17 4.17 0 01-3 4M17.598 6.5A3 3 0 1012 5a3 3 0 10-5.598 1.5M17.997 5.125a4 4 0 012.526 5.77M18 18a4 4 0 002-7.464" />
      <path d="M19.967 17.483A4 4 0 1112 18a4 4 0 11-7.967-.517M6 18a4 4 0 01-2-7.464M6.003 5.125a4 4 0 00-2.526 5.77" />
    </svg>
  );
}
