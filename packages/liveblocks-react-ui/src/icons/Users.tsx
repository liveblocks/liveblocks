import type { ComponentProps } from "react";

import { Icon } from "../components/internal/Icon";

export function UsersIcon(props: ComponentProps<"svg">) {
  return (
    <Icon {...props}>
      <path d="M8 9.75a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Zm0 0c-2.42 0-4.055 1.72-4.422 4.004-.087.545.37.996.922.996h7c.552 0 1.01-.45.922-.996C12.055 11.47 10.42 9.75 8 9.75ZM15 14.75h.5c.552 0 1.004-.45.912-.995-.317-1.888-1.485-4.114-3.412-4.505.863-.222 1.5-1.068 1.5-2a2 2 0 0 0-2-2" />
    </Icon>
  );
}
