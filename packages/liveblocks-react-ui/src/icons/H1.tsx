import type { ComponentProps } from "react";

import { Icon } from "../components/internal/Icon";

export function H1Icon(props: ComponentProps<"svg">) {
  return (
    <Icon {...props}>
      <path d="M4 10h5m-5 4V6m5 8V6m3.5 1.5 2-1.5v8m0 0H13m1.5 0H16" />
    </Icon>
  );
}
