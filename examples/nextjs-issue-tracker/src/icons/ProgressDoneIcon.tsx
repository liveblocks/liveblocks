import { ComponentProps } from "react";

export function ProgressDoneIcon(props: ComponentProps<"svg">) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="1em"
      height="1em"
      viewBox="1 1 22 22"
      {...props}
    >
      <path
        fill="currentColor"
        d="M12 22C6.477 22 2 17.523 2 12S6.477 2 12 2s10 4.477 10 10s-4.477 10-10 10m-.997-6l7.07-7.071l-1.413-1.414l-5.657 5.657l-2.829-2.829l-1.414 1.414z"
      ></path>
    </svg>
  );
}
