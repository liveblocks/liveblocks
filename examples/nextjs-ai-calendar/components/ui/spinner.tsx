import { ComponentProps } from "react";

export function Spinner() {
  return (
    <div className="absolute inset-0 flex items-center justify-center *:opacity-20 *:size-16">
      <SpinnerIcon />
    </div>
  );
}

export function SpinnerIcon(props: ComponentProps<"img">) {
  return (
    <img src="https://liveblocks.io/loading.svg" alt="Loading" {...props} />
  );
}
