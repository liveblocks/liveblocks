import type { ComponentProps } from "react";

import { Icon } from "../components/internal/Icon";

export function CrossCircleFillIcon(props: ComponentProps<"svg">) {
  return (
    <Icon {...props}>
      <circle cx={10} cy={10} r={7} fill="currentColor" />
      <path d="m12.5 7.5-5 5m0-5 5 5" stroke="var(--lb-icon-background)" />
    </Icon>
  );
}
