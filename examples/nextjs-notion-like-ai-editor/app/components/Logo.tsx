import { ComponentProps } from "react";

export function Logo(props: ComponentProps<"div">) {
  return (
    <div className="text-black font-medium text-sm" {...props}>
      Acme Inc
    </div>
  );
}
