import type { ComponentProps } from "react";

import { classNames } from "../../utils/class-names";

export const ICON_WIDTH = 20;
export const ICON_HEIGHT = 20;

export function Icon({ children, className, ...props }: ComponentProps<"svg">) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={ICON_WIDTH}
      height={ICON_HEIGHT}
      viewBox={`0 0 ${ICON_WIDTH} ${ICON_HEIGHT}`}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      role="presentation"
      className={classNames("lb-icon", className)}
      {...props}
    >
      {children}
    </svg>
  );
}
