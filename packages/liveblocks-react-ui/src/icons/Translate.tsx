import type { ComponentProps } from "react";

import { Icon } from "../components/internal/Icon";

export function TranslateIcon(props: ComponentProps<"svg">) {
  return (
    <Icon {...props}>
      <path d="m10.5 16.5.818-1.636M16.5 16.5l-.818-1.636m-4.364 0L13.5 10.5l2.182 4.364m-4.364 0h4.364M10.5 6h-7M7 4 6 3m4 8c-2.936-.505-4.382-1.906-5-5" />
      <path d="M4 11c2.936-.48 4.382-2.053 5-5" />
    </Icon>
  );
}
