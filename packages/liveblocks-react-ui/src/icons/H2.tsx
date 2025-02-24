import type { ComponentProps } from "react";

import { Icon } from "../components/internal/Icon";

export function H2Icon(props: ComponentProps<"svg">) {
  return (
    <Icon {...props}>
      <path d="M4 10h5m-5 4V6m5 8V6m3 1c.37-.6 1.21-1 2-1 1 0 2 .5 2 2 0 1.788-1.5 3-4 6h4" />
    </Icon>
  );
}
