import { ComponentProps } from "react";

export function EarthIcon(props: ComponentProps<"svg">) {
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
      <path d="M21.54 15H17a2 2 0 00-2 2v4.54M7 3.34V5a3 3 0 003 3 2 2 0 012 2c0 1.1.9 2 2 2a2 2 0 002-2c0-1.1.9-2 2-2h3.17M11 21.95V18a2 2 0 00-2-2 2 2 0 01-2-2v-1a2 2 0 00-2-2H2.05" />
      <circle cx={12} cy={12} r={10} />
    </svg>
  );
}
