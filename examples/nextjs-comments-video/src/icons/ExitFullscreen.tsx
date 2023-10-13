import { ComponentProps } from "react";

export function ExitFullscreenIcon(props: ComponentProps<"svg">) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path d="M2 9v1h3.293L1 14.291l.707.709L6 10.707V14h1V9H2ZM15 1.708 14.296 1 10 5.293V2H9v5h5V6h-3.293L15 1.708Z" />
    </svg>
  );
}
