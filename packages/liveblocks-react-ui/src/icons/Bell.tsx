import type { ComponentProps } from "react";

import { Icon } from "../components/internal/Icon";

export function BellIcon(props: ComponentProps<"svg">) {
  return (
    <Icon {...props}>
      <path d="M10 4a3.5 3.5 0 0 0-3.5 3.5c0 3.5-2 6.5-2 6.5h11s-2-3-2-6.5A3.5 3.5 0 0 0 10 4ZM7.55 14a2.5 2.5 0 0 0 4.9 0" />
    </Icon>
  );
}
