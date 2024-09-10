import { ComponentProps } from "react";

export function Progress(props: ComponentProps<"svg">) {
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
      <path d="M10.1 2.18a9.93 9.93 0 013.8 0M17.6 3.71a9.95 9.95 0 012.69 2.7M21.82 10.1a9.93 9.93 0 010 3.8M20.29 17.6a9.95 9.95 0 01-2.7 2.69M13.9 21.82a9.94 9.94 0 01-3.8 0M6.4 20.29a9.95 9.95 0 01-2.69-2.7M2.18 13.9a9.93 9.93 0 010-3.8M3.71 6.4a9.95 9.95 0 012.7-2.69" />
      <circle cx={12} cy={12} r={1} />
    </svg>
  );
}
