import type { KeyboardEvent as ReactKeyboardEvent } from "react";

import { isApple } from "./is-apple";

const MODIFIERS = {
  alt: () => "altKey" as const,
  ctrl: () => "ctrlKey" as const,
  meta: () => "metaKey" as const,
  mod: () => (isApple() ? ("metaKey" as const) : ("ctrlKey" as const)),
  shift: () => "shiftKey" as const,
} as const;

export function isKey(
  event: KeyboardEvent | ReactKeyboardEvent,
  key: string,
  modifiers: Partial<Record<keyof typeof MODIFIERS, boolean>> = {}
) {
  if (event.key !== key) {
    return false;
  }

  const explicitModifiers = Object.entries(modifiers).filter(
    ([, value]) => typeof value === "boolean"
  ) as [keyof typeof MODIFIERS, boolean][];

  return explicitModifiers.every(([modifier, value]) => {
    const property = MODIFIERS[modifier]();

    return event[property] === value;
  });
}
