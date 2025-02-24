import type { ComponentProps } from "react";

import { Icon } from "../components/internal/Icon";

export function SparklesTextIcon(props: ComponentProps<"svg">) {
  return (
    <Icon {...props}>
      <path d="M9 11.5H4.5m3.5 3H4.5m11-6h-11m11-3h-11" />
      <path d="M16 13.5a2.5 2.5 0 0 1-2.5-2.5 2.5 2.5 0 0 1-2.5 2.5 2.5 2.5 0 0 1 2.5 2.5 2.5 2.5 0 0 1 2.5-2.5Z" />
    </Icon>
  );
}
