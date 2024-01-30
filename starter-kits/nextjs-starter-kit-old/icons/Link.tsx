import { ComponentProps } from "react";

export function LinkIcon(props: ComponentProps<"svg">) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path
        d="M7 8.955a3.034 3.034 0 0 0 .942.861 2.792 2.792 0 0 0 2.43.184 2.918 2.918 0 0 0 1.047-.71l1.758-2.05c.534-.584.83-1.365.823-2.175a3.178 3.178 0 0 0-.858-2.16A2.856 2.856 0 0 0 11.095 2a2.85 2.85 0 0 0-2.061.868l-.504.528"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
      <path
        d="M9 7.045a2.983 2.983 0 0 0-.942-.861A2.79 2.79 0 0 0 5.628 6a2.918 2.918 0 0 0-1.047.71L2.823 8.76A3.184 3.184 0 0 0 2 10.936c.007.811.315 1.586.858 2.16A2.856 2.856 0 0 0 4.905 14a2.851 2.851 0 0 0 2.061-.868l.501-.528"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
