import React, { useEffect, useState } from "react";

import { useLayoutEffect } from "./use-layout-effect";

let isHydrated = false;
let id = 0;

function getId() {
  return ++id;
}

// Prevent bundlers from importing `useId` directly.
// See https://github.com/radix-ui/primitives/pull/1028
// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
const useReactId: typeof React.useId = (React as any)["useId".toString()];

function useIncrementalId() {
  const [id, setId] = useState(isHydrated ? getId : null);

  useLayoutEffect(() => {
    if (id === null) {
      setId(getId());
    }
  }, [id]);

  useEffect(() => {
    if (!isHydrated) {
      isHydrated = true;
    }
  }, []);

  return String(id) ?? undefined;
}

// React's `useId` is only available in React >=18.
export const useId: typeof React.useId = useReactId ?? useIncrementalId;
