import type { ComponentProps } from "react";

import { Icon } from "../components/internal/Icon";

export function MinusCircleIcon(props: ComponentProps<"svg">) {
  return (
    <Icon {...props}>
      <circle cx={10} cy={10} r={7} />
      <path d="M7 10h6" />
    </Icon>
  );
}
