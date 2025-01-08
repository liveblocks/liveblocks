import type { ComponentProps } from "react";

import { Icon } from "../components/internal/Icon";

export function StrikethroughIcon(props: ComponentProps<"svg">) {
  return (
    <Icon {...props}>
      <path d="M15.5 10h-11m4.669 0C7.599 9.44 6.5 8.484 6.5 7.125 6.5 5.537 7.79 4.25 10 4.25c1.654 0 2.793.721 3.261 1.75M6.74 14c.468 1.029 1.607 1.75 3.261 1.75 2 0 3.5-1 3.5-2.5 0-.085-.004-.169-.013-.25" />
    </Icon>
  );
}
