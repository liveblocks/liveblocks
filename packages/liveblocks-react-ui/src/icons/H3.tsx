import type { ComponentProps } from "react";

import { Icon } from "../components/internal/Icon";

export function H3Icon(props: ComponentProps<"svg">) {
  return (
    <Icon {...props}>
      <path d="M4 10h5m-5 4V6m5 8V6m3 1c.37-.6 1.2-1 2-1 .97 0 2 .5 2 2 0 1.79-1.47 2-2 2 .53 0 2 .21 2 2 0 1.5-1.03 2-2 2-.8 0-1.63-.4-2-1" />
    </Icon>
  );
}
