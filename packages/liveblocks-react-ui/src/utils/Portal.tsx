"use client";

import { Slot } from "radix-ui";
import { forwardRef } from "react";
import { createPortal } from "react-dom";

import type { ComponentPropsWithSlot } from "../types";

const PORTAL_NAME = "Portal";

interface PortalProps extends ComponentPropsWithSlot<"div"> {
  /**
   * The container to render the portal into.
   */
  container?: HTMLElement | null;
}

const Portal = forwardRef<HTMLDivElement, PortalProps>(
  ({ container = document?.body, asChild, ...props }, forwardedRef) => {
    const Component = asChild ? Slot.Slot : "div";

    return container
      ? createPortal(
          <Component data-liveblocks-portal="" {...props} ref={forwardedRef} />,
          container
        )
      : null;
  }
);

if (process.env.NODE_ENV !== "production") {
  Portal.displayName = PORTAL_NAME;
}

export { Portal };
