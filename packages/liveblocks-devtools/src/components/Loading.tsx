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
      <g>
        <g transform="translate(-22.5,-16)">
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M0 0H45L12.9496 32V13.44L0 0Z"
            fill="currentColor"
          />
          <animateMotion
            dur="2s"
            repeatCount="indefinite"
            path="M54.5 61C54.5 61 77 32 87 42C97 52 73.5 67 73.5 67"
            calcMode="spline"
            keyTimes="0;1"
            keySplines="0.6 0 0.4 1"
          />
          <animateTransform
            attributeName="transform"
            type="rotate"
            from="0 22.5 16"
            to="180 22.5 16"
            dur="2s"
            repeatCount="indefinite"
            fill="freeze"
            additive="sum"
            calcMode="spline"
            keyTimes="0;1"
            keySplines="0.8 0 0.2 1"
          />
        </g>
        <g transform="translate(-22.5,-16)">
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M45 32H0L32.0504 0V18.56L45 32Z"
            fill="currentColor"
          />
          <animateMotion
            dur="2s"
            repeatCount="indefinite"
            path="M73.5 67C73.5 67 51 96 41 86C31 76 54.5 61 54.5 61"
            calcMode="spline"
            keyTimes="0;1"
            keySplines="0.6 0 0.4 1"
          />
          <animateTransform
            attributeName="transform"
            type="rotate"
            from="0 22.5 16"
            to="180 22.5 16"
            dur="2s"
            repeatCount="indefinite"
            fill="freeze"
            additive="sum"
            calcMode="spline"
            keyTimes="0;1"
            keySplines="0.8 0 0.2 1"
          />
        </g>
        <animateTransform
          attributeName="transform"
          type="rotate"
          from="0 64 64"
          to="180 64 64"
          dur="2s"
          repeatCount="indefinite"
          fill="freeze"
          additive="sum"
          calcMode="spline"
          keyTimes="0;1"
          keySplines="0.8 0 0.2 1"
        />
      </g>
    </svg>
  );
}
