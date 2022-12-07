import { deepEqual } from "fast-equals";
import type { DependencyList, EffectCallback } from "react";
import { useEffect, useRef } from "react";

export function useDeepEffect(
  callback: EffectCallback,
  dependencies: DependencyList
): void {
  const signal = useRef<number>(0);
  const previousDependencies = useRef<DependencyList>(dependencies);

  if (!deepEqual(previousDependencies.current, dependencies)) {
    signal.current += 1;
  }

  previousDependencies.current = dependencies;

  useEffect(callback, [signal.current]);
}
