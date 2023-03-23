import cx from "classnames";
import type { ComponentProps } from "react";

interface Props extends ComponentProps<"svg"> {
  animate?: boolean;
}

export function Loading({ className, animate = true, ...props }: Props) {
  return (
    <svg
      width="96"
      height="96"
      viewBox="0 0 128 128"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cx(className, "text-light-500 dark:text-dark-500")}
      {...props}
    >
      <g
        id={animate ? "loading-group" : undefined}
        fill="currentColor"
        fillRule="evenodd"
        clipRule="evenodd"
      >
        <path
          id={animate ? "loading-top" : undefined}
          d="M96 83H51L83.0504 51V69.56L96 83Z"
        />
        <path
          id={animate ? "loading-bottom" : undefined}
          d="M32 45H77L44.9496 77V58.44L32 45Z"
        />
      </g>
    </svg>
  );
}
