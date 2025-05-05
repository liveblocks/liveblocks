import type { ComponentProps } from "react";

import { Icon } from "../components/internal/Icon";

export function CopyIcon(props: ComponentProps<"svg">) {
  return (
    <Icon {...props}>
      <path d="M4.5 12.91c-.58-.2-1-.76-1-1.41v-6c0-1.1.9-2 2-2h6c.65 0 1.2.42 1.41 1" />
      <rect x={7} y={7} width={9.5} height={9.5} rx={1.5} />
    </Icon>
  );
}
