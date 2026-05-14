export function AiCommentChevronIcon({
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
