import "react";

// Allow CSS custom properties (`--other-color`, …) in `style` props.
declare module "react" {
  interface CSSProperties {
    [key: `--${string}`]: string | number | undefined;
  }
}
