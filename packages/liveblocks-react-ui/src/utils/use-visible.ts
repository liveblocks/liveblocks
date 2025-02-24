import { type RefObject, useEffect, useState } from "react";

import { useLatest } from "./use-latest";

type Options = { enabled?: boolean };

type IntersectionObserverSingleCallback = (
  entry: IntersectionObserverEntry
) => void;

let intersectionObserver: IntersectionObserver | undefined;
const intersectionCallbacks = new WeakMap<
  Element,
  IntersectionObserverSingleCallback
>();

function observe(
  element: Element,
  callback: IntersectionObserverSingleCallback
) {
  if (!intersectionObserver) {
    intersectionObserver = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        const callback = intersectionCallbacks.get(entry.target);

        callback?.(entry);
      }
    });
  }

  intersectionCallbacks.set(element, callback);
  intersectionObserver.observe(element);
}

function unobserve(element: Element) {
  intersectionCallbacks.delete(element);
  intersectionObserver?.unobserve(element);
}

/**
 * Observe whether an element is currently visible or not.
 */
export function useVisible(ref: RefObject<Element>, options?: Options) {
  const [isVisible, setVisible] = useState(false);
  const enabled = options?.enabled ?? true;

  useEffect(() => {
    const element = ref.current;

    if (!element) {
      return;
    }

    if (enabled) {
      observe(element, (entry) => {
        setVisible(entry.isIntersecting);
      });
    } else {
      unobserve(element);
    }

    return () => {
      unobserve(element);
    };
  }, [enabled]); // eslint-disable-line react-hooks/exhaustive-deps

  return isVisible;
}

export function useVisibleCallback<T extends (...args: any[]) => void>(
  ref: RefObject<Element>,
  callback: T,
  options?: Options
) {
  const enabled = options?.enabled ?? true;
  const latestCallback = useLatest(callback);

  useEffect(() => {
    const element = ref.current;

    if (!element) {
      return;
    }

    if (enabled) {
      observe(element, (entry) => {
        if (entry.isIntersecting) {
          latestCallback.current();
        }
      });
    } else {
      unobserve(element);
    }

    return () => {
      unobserve(element);
    };
  }, [enabled]); // eslint-disable-line react-hooks/exhaustive-deps
}
