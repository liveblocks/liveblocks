import { ComponentProps } from "react";

export function UnderlineIcon(props: ComponentProps<"svg">) {
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
      <path d="M6 4v6a6 6 0 0012 0V4" />
      <path d="M4 20L20 20" />
    </svg>
  );
}
