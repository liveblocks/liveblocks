"use client";

import * as React from "react";
import { Button } from "./button";
import { Kbd } from "./kbd";
import { Tooltip, TooltipContent, TooltipTrigger } from "./tooltip";

/** An icon button with its label (and shortcut) in a tooltip. */
export function TooltipButton({
  label,
  shortcut,
  side,
  variant = "ghost",
  size = "icon-sm",
  ...props
}: React.ComponentProps<typeof Button> & {
  label: string;
  shortcut?: string[];
  side?: React.ComponentProps<typeof TooltipContent>["side"];
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant={variant} size={size} aria-label={label} {...props} />
      </TooltipTrigger>
      <TooltipContent side={side}>
        {label}
        {shortcut ? (
          <span className="flex gap-0.5">
            {shortcut.map((key) => (
              <Kbd key={key}>{key}</Kbd>
            ))}
          </span>
        ) : null}
      </TooltipContent>
    </Tooltip>
  );
}
