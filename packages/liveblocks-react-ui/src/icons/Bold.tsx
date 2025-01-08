import type { ComponentProps } from "react";

import { Icon } from "../components/internal/Icon";

export function BoldIcon(props: ComponentProps<"svg">) {
  return (
    <Icon {...props}>
      <path d="M5.5 10h6.63m0 5.75H5.5V4.25h5.63M11.125 10a2.875 2.875 0 0 0 0-5.75m1 11.5a2.875 2.875 0 0 0 0-5.75" />
    </Icon>
  );
}
