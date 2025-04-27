import type { ComponentProps } from "react";

import { Icon } from "../components/internal/Icon";

export function CopyIcon(props: ComponentProps<"svg">) {
  return (
    <Icon {...props}>
      <rect x="7.33" y="7.33" width="9.48" height="9.48" rx="1.38" ry="1.38" />
      <path d="M4.57 12.67 c-0.73 0 -1.38 -0.65 -1.38 -1.38 V4.57 c0 -0.73 0.65 -1.38 1.38 -1.38 h6.72 c0.73 0 1.38 0.65 1.38 1.38" />
    </Icon>
  );
}
