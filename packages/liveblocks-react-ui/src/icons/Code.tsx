import type { ComponentProps } from "react";

import { Icon } from "../components/internal/Icon";

export function CodeIcon(props: ComponentProps<"svg">) {
  return (
    <Icon {...props}>
      <path d="m7.5 6-4 4 4 4m5-8 4 4-4 4" />
    </Icon>
  );
}
