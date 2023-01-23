import cx from "classnames";
import type { ComponentProps } from "react";

export function Loading({ className, ...props }: ComponentProps<"svg">) {
  return (
    <svg
      width="128"
      height="128"
      viewBox="0 0 128 128"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cx(className, "text-light-500 dark:text-dark-500")}
      {...props}
    >
      <g
        id="loading-group"
        fill="currentColor"
        fill-rule="evenodd"
        clip-rule="evenodd"
      >
        <path id="loading-top" d="M96 83H51L83.0504 51V69.56L96 83Z" />
        <path id="loading-bottom" d="M32 45H77L44.9496 77V58.44L32 45Z" />
      </g>
    </svg>
  );
}
