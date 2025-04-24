import type { ComponentProps } from "react";

import { Icon } from "../components/internal/Icon";

export function StopIcon(props: ComponentProps<"svg">) {
  return (
    <Icon {...props}>
      <rect x={5} y={5} width={10} height={10} rx={1} fill="currentColor" />
    </Icon>
  );
}
