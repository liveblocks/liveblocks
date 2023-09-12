import type { ComponentProps } from "react";
import React from "react";

import { classNames } from "../utils/class-names";

export function EditIcon({ className, ...props }: ComponentProps<"svg">) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={20}
      height={20}
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      role="presentation"
      className={classNames("lb-icon", className)}
      {...props}
    >
      <path d="m11.784 5.797-6.13 6.138a4 4 0 0 0-1.03 1.775L4 16l2.285-.624a4 4 0 0 0 1.776-1.032l6.145-6.152m-2.422-2.395 1.244-1.246c.608-.608 1.826-.81 2.53-.104.7.7.499 1.893-.122 2.515l-1.23 1.23m-2.422-2.395 2.422 2.395" />
    </svg>
  );
}
