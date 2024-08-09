import { ComponentProps } from "react";

export function Todo(props: ComponentProps<"svg">) {
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
      <path d="M10.1 2.182a10 10 0 013.8 0M13.9 21.818a10 10 0 01-3.8 0M17.609 3.721a10 10 0 012.69 2.7M2.182 13.9a10 10 0 010-3.8M20.279 17.609a10 10 0 01-2.7 2.69M21.818 10.1a10 10 0 010 3.8M3.721 6.391a10 10 0 012.7-2.69M6.391 20.279a10 10 0 01-2.69-2.7" />
    </svg>
  );
}
