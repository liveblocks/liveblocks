import { ComponentProps } from "react";

export function LengthenIcon(props: ComponentProps<"svg">) {
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
      <path d="M3 16l4 4 4-4M7 20V4M11 4h4M11 8h7M11 12h10" />
    </svg>
  );
}
