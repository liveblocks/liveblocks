import type { ComponentProps } from "react";
import React from "react";

import { Icon } from "../components/internal/Icon";

export function RestoreIcon(props: ComponentProps<"svg">) {
  return (
    <Icon {...props}>
      <path d="M3.674 7a7 7 0 1 1-.603 4" />
      <path d="M3.5 3.5V7H7m3-.5V10l2.5 1.5" />
    </Icon>
  );
}
