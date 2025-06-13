import type { ComponentProps } from "react";

import { Icon } from "../components/internal/Icon";

export function MinusIcon(props: ComponentProps<"svg">) {
  return (
    <Icon {...props}>
      <line
        x1={6}
        y1={10}
        x2={14}
        y2={10}
        stroke="currentColor"
        strokeWidth={1}
        strokeLinecap="round"
      />
    </Icon>
  );
}
