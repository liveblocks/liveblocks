import type { ComponentPropsWithSlot } from "../../../types";

export interface RootProps extends ComponentPropsWithSlot<"div"> {
  open: boolean;
  onOpenChange(open: boolean): void;
  disabled?: boolean;
}

export type TriggerProps = ComponentPropsWithSlot<"button">;

export type ContentProps = ComponentPropsWithSlot<"div">;
