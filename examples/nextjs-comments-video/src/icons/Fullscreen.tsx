import { ComponentProps } from "react";

export function FullscreenIcon(props: ComponentProps<"svg">) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path d="M10 1v1h3.293L9 6.291 9.707 7 14 2.707V6h1V1h-5ZM7 9.708 6.296 9 2 13.293V10H1v5h5v-1H2.707L7 9.708Z" />
    </svg>
  );
}
