import { ComponentProps } from "react";

export function ReplaceIcon(props: ComponentProps<"svg">) {
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
      <path d="M14 4c0-1.1.9-2 2-2M20 2c1.1 0 2 .9 2 2M22 8c0 1.1-.9 2-2 2M16 10c-1.1 0-2-.9-2-2M3 7l3 3 3-3" />
      <path d="M6 10V5c0-1.7 1.3-3 3-3h1" />
      <rect width={8} height={8} x={2} y={14} rx={2} />
    </svg>
  );
}
