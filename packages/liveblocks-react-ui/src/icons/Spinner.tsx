import type { ComponentProps } from "react";
import React from "react";

import { Icon } from "../components/internal/Icon";

export function SpinnerIcon(props: ComponentProps<"svg">) {
  return (
    <Icon {...props}>
      <path d="M3 10a7 7 0 0 1 7-7" className="lb-icon-spinner" />
    </Icon>
  );
}
