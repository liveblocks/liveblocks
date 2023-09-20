import React from "react";

// Prevent bundlers from importing `useTransition` directly
// See https://github.com/radix-ui/primitives/pull/1028
// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
const useReactTransition: typeof React.useTransition = (React as any)[
  "useTransition".toString()
];

function useTransitionFallback(transition: () => void) {
  return [false, transition] as ReturnType<typeof useReactTransition>;
}

// React's `useTransition` is only available in React >=18.
export const useTransition: typeof React.useTransition =
  useReactTransition ?? useTransitionFallback;
