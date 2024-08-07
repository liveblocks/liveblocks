import { ComponentProps } from "react";

export function StrikethroughIcon(props: ComponentProps<"svg">) {
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
      <path d="M16 4H9a3 3 0 00-2.83 4M14 12a4 4 0 010 8H6" />
      <path d="M4 12L20 12" />
    </svg>
  );
}
