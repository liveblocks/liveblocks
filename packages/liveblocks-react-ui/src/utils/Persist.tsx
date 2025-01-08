"use client";

import { nn } from "@liveblocks/core";
import { useLayoutEffect } from "@liveblocks/react/_private";
import type { ReactNode, RefObject } from "react";
import {
  Children,
  createContext,
  isValidElement,
  useCallback,
  useContext,
  useRef,
  useState,
} from "react";
import { flushSync } from "react-dom";

// Persist is an overly simplified version of Framer Motion's AnimatePresence,
// mostly mimicking its usePresence API: https://github.com/framer/motion/blob/main/packages/framer-motion/src/components/AnimatePresence/use-presence.ts

const PERSIST_NAME = "Persist";

interface PersistProps {
  children: Exclude<ReactNode, Iterable<ReactNode>>;
}

type PersistContext = [boolean, () => void];

const PersistContext = createContext<PersistContext | null>(null);

export function usePersist() {
  const persistContext = useContext(PersistContext);

  return nn(persistContext, "Persist is missing from the React tree.");
}

function getChild(children: ReactNode) {
  const child: ReactNode = Array.isArray(children)
    ? Children.only(children)
    : children;

  return isValidElement(child) ? child : undefined;
}

export function useAnimationPersist(ref: RefObject<HTMLElement>) {
  const [isPresent, unmount] = usePersist();
  const previousAnimationName = useRef<string | null>(null);
  const unmountAnimationName = useRef<string | null>(null);

  useLayoutEffect(() => {
    const element = ref.current;

    if (!element) {
      return;
    }

    /**
     * Stop persisting at the end of the last animation.
     *
     * We keep track of all ending animations because animations stay
     * on getComputedStyle(element).animationName even if they're over,
     * so we need to keep track of previous animations to truly know if
     * an animation should be waited on.
     */
    const handleAnimationEnd = (event: AnimationEvent) => {
      if (event.animationName === unmountAnimationName.current) {
        unmount();
      }

      previousAnimationName.current = event.animationName;
    };

    element.addEventListener("animationcancel", handleAnimationEnd);
    element.addEventListener("animationend", handleAnimationEnd);

    return () => {
      element.removeEventListener("animationcancel", handleAnimationEnd);
      element.removeEventListener("animationend", handleAnimationEnd);
    };
  }, [ref, unmount]);

  useLayoutEffect(() => {
    const element = ref.current;
    let animationFrameId: number;

    if (!element) {
      return;
    }

    if (!isPresent) {
      // If the element should be unmounting, wait for a repaint and check
      // if it is visible and has an animation. If not, unmount immediately.
      animationFrameId = requestAnimationFrame(() => {
        const styles = getComputedStyle(element);
        unmountAnimationName.current = styles.animationName;

        if (
          styles.animationName === "none" ||
          styles.animationName === previousAnimationName.current ||
          styles.display === "none"
        ) {
          unmount();
        }
      });
    }

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [isPresent, ref, unmount]);
}

/**
 * Persist a component until it decides to unmount by
 * itself (instead of orchestrating the unmount from the parent).
 */
export function Persist({ children }: PersistProps) {
  const [isPersisting, setPersisting] = useState(true);
  const lastPresentChild = useRef<ReactNode>(null);
  const child = getChild(children);

  const unmount = useCallback(() => {
    flushSync(() => setPersisting(false));
  }, []);

  useLayoutEffect(() => {
    if (child) {
      setPersisting(true);
      lastPresentChild.current = child;
    }
  }, [child]);

  return (
    <PersistContext.Provider value={[Boolean(child), unmount]}>
      {child ?? (isPersisting ? lastPresentChild.current : null)}
    </PersistContext.Provider>
  );
}

if (process.env.NODE_ENV !== "production") {
  Persist.displayName = PERSIST_NAME;
}
