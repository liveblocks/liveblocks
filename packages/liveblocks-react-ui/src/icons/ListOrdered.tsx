import type { ComponentProps } from "react";

import { Icon } from "../components/internal/Icon";

export function ListOrderedIcon(props: ComponentProps<"svg">) {
  return (
    <Icon {...props}>
      <path d="M16 14.25H9M16 10H9m7-4.25H9m-5 0 1-.5V8.5m0 0H4m1 0h1m-2 3.4c.18-.24.6-.4 1-.4.5 0 1 .2 1 .81 0 .73-.75 1.22-2 2.44h2" />
    </Icon>
  );
}
