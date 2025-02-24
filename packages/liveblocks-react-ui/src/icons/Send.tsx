import type { ComponentProps } from "react";

import { Icon } from "../components/internal/Icon";

export function SendIcon(props: ComponentProps<"svg">) {
  return (
    <Icon {...props}>
      <path d="m5 16 12-6L5 4l2 6-2 6ZM7 10h10" />
    </Icon>
  );
}
