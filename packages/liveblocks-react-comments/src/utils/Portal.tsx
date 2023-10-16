"use client";

import { Slot } from "@radix-ui/react-slot";
import React, { forwardRef } from "react";
import { createPortal } from "react-dom";

import type { ComponentPropsWithSlot } from "../types";

const PORTAL_NAME = "Portal";

const Portal = forwardRef<HTMLDivElement, ComponentPropsWithSlot<"div">>(
  ({ asChild, ...props }, forwardedRef) => {
    const Component = asChild ? Slot : "div";
    const container = document?.body;

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
