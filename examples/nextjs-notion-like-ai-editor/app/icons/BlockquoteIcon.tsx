import React from "react";
import { SVGAttributes } from "react";

export function BlockquoteIcon(props: SVGAttributes<SVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M17 6H3" />
      <path d="M21 12H8" />
      <path d="M21 18H8" />
      <path d="M3 12v6" />
    </svg>
  );
}
