import { ComponentProps } from "react";

export function ShortenIcon(props: ComponentProps<"svg">) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={24}
      height={24}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M3 8l4-4 4 4M7 4v16M11 12h4M11 16h7M11 20h10" />
    </svg>
  );
}
