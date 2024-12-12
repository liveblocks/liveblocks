import type { ComponentProps } from "react";
import React from "react";

import { Icon } from "../components/internal/Icon";

export function TranslateIcon(props: ComponentProps<"svg">) {
  return (
    <Icon {...props}>
      <path d="m10.5 16 .75-1.5M16 16l-.75-1.5m-4 0 2-4 2 4m-4 0h4M11 6.5H4m3.5-2-1-1m3.5 7c-2.544-.404-3.796-1.525-4.331-4" />
      <path d="M5 10.5c2.544-.404 3.796-1.525 4.331-4" />
    </Icon>
  );
}
