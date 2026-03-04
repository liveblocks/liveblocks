import type { ComponentPropsWithoutRef, CSSProperties, ReactNode } from "react";
import { forwardRef } from "react";

import { cn } from "../utils/cn";

export interface CursorProps extends ComponentPropsWithoutRef<"div"> {
  /**
   * A floating label to display next to the cursor.
   */
  label?: ReactNode;

  /**
   * The color of the cursor.
   */
  color?: string;
}

/**
 * Displays a multiplayer cursor.
 */
export const Cursor = forwardRef<HTMLDivElement, CursorProps>(
  ({ className, label, color, style, ...props }, forwardedRef) => {
    return (
      <div
        className={cn("lb-root lb-cursor", className)}
        style={{ "--lb-cursor-color": color, ...style } as CSSProperties}
        {...props}
        ref={forwardedRef}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 32 32"
          className="lb-cursor-pointer"
        >
          <path
            fill="currentColor"
            d="m.088 1.75 11.25 29.422c.409 1.07 1.908 1.113 2.377.067l5.223-11.653c.13-.288.36-.518.648-.648l11.653-5.223c1.046-.47 1.004-1.968-.067-2.377L1.75.088C.71-.31-.31.71.088 1.75Z"
          />
        </svg>
        {label ? (
          <div className="lb-cursor-bubble">
            <span className="lb-cursor-bubble-label">{label}</span>
          </div>
        ) : null}
      </div>
    );
  }
);
