import { ComponentProps } from "react";

export function MyIssuesIcon(props: ComponentProps<"svg">) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={24}
      height={24}
      viewBox="1 1 22 22"
      {...props}
    >
      <path
        fill="currentColor"
        d="M2 12c0 5.523 4.477 10 10 10s10-4.477 10-10S17.523 2 12 2S2 6.477 2 12m18 0a8 8 0 1 1-16 0a8 8 0 0 1 16 0m-8 6a6 6 0 1 0 0-12a6 6 0 0 0 0 12"
      ></path>
    </svg>
  );
}
