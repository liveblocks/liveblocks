"use client";

import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

// Whether this is an Apple device, where keys have other names: Option
// instead of Alt, and Command instead of Ctrl
export function useIsMac() {
  return useSyncExternalStore(
    subscribe,
    () => /Mac|iPhone|iPad/.test(navigator.platform),
    () => false
  );
}
