"use client";

import { Slot as SlotPrimitive } from "radix-ui";
import { forwardRef } from "react";
import { createPortal } from "react-dom";

import { useLiveblocksUiConfig } from "../config";
import type { ComponentPropsWithSlot } from "../types";

const PORTAL_NAME = "Portal";

const Portal = forwardRef<HTMLDivElement, ComponentPropsWithSlot<"div">>(
  ({ asChild, ...props }, forwardedRef) => {
    const { portalContainer } = useLiveblocksUiConfig();
    const container = portalContainer ?? document?.body;
    const Component = asChild ? SlotPrimitive.Slot : "div";

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
