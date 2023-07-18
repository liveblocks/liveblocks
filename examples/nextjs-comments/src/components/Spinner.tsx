import type { ComponentProps } from "react";

const STYLE = `
@keyframes rotate {
  0% {
    transform: rotate(0deg);
  }

  100% {
    transform: rotate(180deg);
  }
}

@keyframes offset-distance {
  0% {
    offset-distance: 0%;
  }

  100% {
    offset-distance: 100%;
  }
}

@keyframes offset-rotate {
  0% {
    offset-rotate: 0deg;
  }
  100% {
    offset-rotate: 180deg;
  }
}

:root {
  --duration: 2s;
  --ease-in-out-quart: cubic-bezier(0.6, 0, 0.4, 1);
  --ease-in-out-expo: cubic-bezier(0.8, 0, 0.2, 1);
}

#group {
  transform-box: fill-box;
  transform-origin: center;
  animation: rotate var(--duration) infinite var(--ease-in-out-expo);
}

#top {
  offset-path: path("M73.5 67C73.5 67 51 96 41 86C31 76 54.5 61 54.5 61");
  transform-origin: 73.5px 67px;
  animation: offset-distance var(--duration) infinite
      var(--ease-in-out-quart),
    offset-rotate var(--duration) infinite var(--ease-in-out-expo);
}

#bottom {
  offset-path: path("M54.5 61C54.5 61 77 32 87 42C97 52 73.5 67 73.5 67");
  transform-origin: 54.5px 61px;
  animation: offset-distance var(--duration) infinite
      var(--ease-in-out-quart),
    offset-rotate var(--duration) infinite var(--ease-in-out-expo);
}`;

export function Spinner(props: ComponentProps<"svg">) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="128"
      height="128"
      viewBox="0 0 128 128"
      fill="none"
      {...props}
    >
      <style>{STYLE}</style>
      <g id="group" fill="currentColor" fillRule="evenodd" clipRule="evenodd">
        <path id="top" d="M96 83H51L83.0504 51V69.56L96 83Z" />
        <path id="bottom" d="M32 45H77L44.9496 77V58.44L32 45Z" />
      </g>
    </svg>
  );
}
