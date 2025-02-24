import type { ComponentProps } from "react";

import { Icon } from "../components/internal/Icon";

export function EllipsisIcon(props: ComponentProps<"svg">) {
  return (
    <Icon fill="currentColor" {...props}>
      <circle cx={5} cy={10} r={0.75} />
      <circle cx={10} cy={10} r={0.75} />
      <circle cx={15} cy={10} r={0.75} />
    </Icon>
  );
}
