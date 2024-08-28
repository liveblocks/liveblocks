import type { ComponentProps } from "react";
import React from "react";

import { Icon } from "../components/internal/Icon";

export function VersionHistoryIcon(props: ComponentProps<"svg">) {
  return (
    <Icon {...props}>
      <path d="M3 10a7 7 0 1 0 .674-3" />
      <path d="M3.5 3.5V7H7m3-.5V10l2.5 1.5" />
    </Icon>
  );
}
