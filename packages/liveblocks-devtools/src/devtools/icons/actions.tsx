import type { ComponentProps } from "react";

export function EyeIcon(props: ComponentProps<"svg">) {
  return (
    <svg
      width="20"
      height="20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M2.408 9.232a1.492 1.492 0 0 0 0 1.536C3.304 12.281 5.716 15.5 10 15.5s6.696-3.22 7.592-4.732a1.492 1.492 0 0 0 0-1.536C16.696 7.719 14.284 4.5 10 4.5S3.304 7.72 2.408 9.232ZM12.5 10a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0Z"
        fill="currentColor"
      />
    </svg>
  );
}
