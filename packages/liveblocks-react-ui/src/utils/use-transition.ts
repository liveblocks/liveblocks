import type { TransitionFunction } from "react";
import React, { useCallback } from "react";

// Prevent bundlers from importing `useTransition` directly
// See https://github.com/radix-ui/primitives/pull/1028
// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
const useReactTransition: typeof React.useTransition = (React as any)[
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  "useTransition".toString()
];

function useTransitionFallback(): ReturnType<typeof useReactTransition> {
  const startTransition = useCallback(
    (callback: TransitionFunction) => callback(),
    []
  );

  return [false, startTransition];
}

// React's `useTransition` is only available in React >=18.
export const useTransition: typeof React.useTransition =
  useReactTransition ?? useTransitionFallback;
