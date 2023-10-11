"use client";

import { ReactNode, useCallback, useEffect, useRef, useState } from "react";
import { ClientSideSuspense } from "@liveblocks/react";
import * as ContextMenu from "@radix-ui/react-context-menu";
import styles from "./EditableTextMenu.module.css";

export function EditableTextMenu({ children }: { children: ReactNode }) {
  return (
    <ClientSideSuspense fallback={<>{children}</>}>
      {() => <LoadedEditableTextMenu>{children}</LoadedEditableTextMenu>}
    </ClientSideSuspense>
  );
}

function LoadedEditableTextMenu({ children }: { children: ReactNode }) {
  const [editableElements, setEditableElements] = useState<HTMLElement[]>([]);
  const getCurrentElements = useCurrentElements();
  const { hide, reset } = useHideElements();

  // on menu open, set list of elements under current cursor
  const handleOpen = useCallback(
    (open: boolean) => {
      if (!open) {
        setEditableElements([]);
        return;
      }

      setEditableElements(getCurrentElements());
    },
    [getCurrentElements]
  );

  const handleSelect = useCallback(
    (element: HTMLElement) => {
      const editable = element.querySelector("[data-editable]");
      if (!editable || !(editable instanceof HTMLElement)) {
        return;
      }

      setTimeout(() => {
        // Hide overlapping elements and focus
        hide(editable);
        editable.focus();

        // Reset overlapping elements on blur
        editable.addEventListener(
          "blur",
          () => {
            reset();
          },
          { once: true }
        );
      });
    },
    [hide, reset]
  );

  return (
    <ContextMenu.Root onOpenChange={handleOpen}>
      <ContextMenu.Trigger>{children}</ContextMenu.Trigger>
      <ContextMenu.Portal>
        <ContextMenu.Content className={styles.menu}>
          {editableElements.map((element, index) => (
            <ContextMenu.Item
              key={index}
              onSelect={() => handleSelect(element)}
              className={styles.menuItem}
            >
              {element.innerText || element.innerHTML}
            </ContextMenu.Item>
          ))}
        </ContextMenu.Content>
      </ContextMenu.Portal>
    </ContextMenu.Root>
  );
}

function useHideElements() {
  const initialStates = useRef<Map<Element, string>>(new Map());
  const currentlyHidden = useRef<Element[]>([]);

  // Remove pointer events from all elements under or overlapping the current element
  const hide = useCallback((element: HTMLElement) => {
    const elementsToHide = getElementsInSameLocation(element);

    elementsToHide.forEach((el) => {
      if (el instanceof HTMLElement) {
        initialStates.current.set(el, getComputedStyle(el).pointerEvents || "");
        el.style.pointerEvents = "none";
        currentlyHidden.current.push(el);
      }
    });
  }, []);

  // Reset hidden elements to initial state
  const reset = useCallback(() => {
    for (const el of currentlyHidden.current) {
      if (el instanceof HTMLElement && initialStates.current.get(el)) {
        el.style.pointerEvents = initialStates.current.get(el) as string;
      }
    }

    initialStates.current = new Map();
    currentlyHidden.current = [];
  }, []);

  return { hide, reset };
}

function useCurrentElements() {
  const coords = useCoords();

  // Get all editable elements under the current cursor
  return useCallback(() => {
    const { x, y } = coords.current;
    const allElements = document.elementsFromPoint(x, y);

    const editableElements: Element[] = [];
    let hidableElements: Element[] = [];

    // Find all editable text elements
    allElements.forEach((el) => {
      const isEditable = (el as HTMLElement)?.dataset.strapiEditable;
      if (isEditable) {
        editableElements.push(el);
      } else {
        hidableElements.push(el);
      }
    });

    // Don't hide children of editable elements, e.g. the contentEditable element
    hidableElements = hidableElements.filter((hidable) => {
      return !editableElements.some((editable) => editable.contains(hidable));
    });

    // Filter out non-HTMLElements
    return editableElements.filter((el) => {
      return el instanceof HTMLElement;
    }) as HTMLElement[];
  }, [coords]);
}

// Get current page coords
function useCoords() {
  const coords = useRef({ x: -10000, y: -10000 });

  useEffect(() => {
    function onPointerMove(e: PointerEvent) {
      coords.current = { x: e.clientX, y: e.clientY };
    }

    window.addEventListener("pointermove", onPointerMove);

    return () => {
      window.removeEventListener("pointermove", onPointerMove);
    };
  }, []);

  return coords;
}

// Return a list of elements that are in the same physical location as `element`
function getElementsInSameLocation(element: Element) {
  const rect = element.getBoundingClientRect();
  const elements = new Map();

  // Checking every pixel is too much, so check every 50th instead
  const step = 50;

  for (let x = rect.left; x <= rect.right; x += step) {
    for (let y = rect.top; y <= rect.bottom; y += step) {
      const elementsAtPoint = document.elementsFromPoint(x, y);

      for (const el of elementsAtPoint) {
        // Ignore the target element and its children
        if (el !== element && !element.contains(el)) {
          elements.set(el, (elements.get(el) || 0) + 1);
        }
      }
    }
  }

  const totalPoints =
    Math.ceil(rect.width / step) * Math.ceil(rect.height / step);
  const elementsInSameLocation: Element[] = [];

  elements.forEach((count, el) => {
    if (count === totalPoints) {
      elementsInSameLocation.push(el);
    }
  });

  return elementsInSameLocation;
}
