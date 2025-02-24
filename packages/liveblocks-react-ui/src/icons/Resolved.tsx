import type { ComponentProps } from "react";

import { Icon } from "../components/internal/Icon";

export function ResolvedIcon(props: ComponentProps<"svg">) {
  return (
    <Icon {...props}>
      <circle cx={10} cy={10} r={7} fill="currentColor" />
      <path d="m13 8-4 4-2-2" stroke="var(--lb-icon-background)" />
    </Icon>
  );
}
