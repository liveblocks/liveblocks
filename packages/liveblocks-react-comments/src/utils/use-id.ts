import React, { useEffect, useState } from "react";

import { useLayoutEffect } from "./use-layout-effect";

let isHydrated = false;
let id = 0;

function getId() {
  return ++id;
}

// Prevent bundlers from importing `useId` directly
// See https://github.com/radix-ui/primitives/pull/1028
const useReactId = (React as any)["useId".toString()] || (() => undefined);

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

export const useId: () => string = useReactId ?? useIncrementalId;
