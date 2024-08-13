import type { ComponentProps } from "react";
import React from "react";

import { Icon } from "../components/internal/Icon";

export function WarningIcon(props: ComponentProps<"svg">) {
  return (
    <Icon {...props}>
      <path d="m3.794 13.526 5.326-9.89a1 1 0 0 1 1.76 0l5.326 9.89a1 1 0 0 1-.88 1.474H4.674a1 1 0 0 1-.88-1.474ZM10 7.5v2m0 2.5h.007" />
      <circle cx={10} cy={12} r={0.25} />
    </Icon>
  );
}
