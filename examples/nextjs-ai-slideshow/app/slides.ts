"use client";

import { useRoom } from "@liveblocks/react/suspense";
import { getYjsProviderForRoom } from "@liveblocks/yjs";
import { nanoid } from "nanoid";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  getSlideIds,
  getSlideText,
  INITIAL_SLIDE_ID,
  SLIDES_ARRAY_KEY,
} from "./slide-doc";
import { EMPTY_SLIDE_HTML, STARTER_SLIDE_HTML } from "./slide-html";

export function useSlides(): {
  slideIds: string[];
  addSlide: () => string;
  deleteSlide: (id: string) => void;
  moveSlide: (fromIndex: number, toIndex: number) => void;
} {
  const room = useRoom();
  const [slideIds, setSlideIds] = useState<string[]>([]);
  const seeded = useRef(false);

  useEffect(() => {
    const provider = getYjsProviderForRoom(room);
    const ydoc = provider.getYDoc();
    const slides = ydoc.getArray<string>(SLIDES_ARRAY_KEY);

    const updateSlideIds = () => {
      setSlideIds(getSlideIds(ydoc));
    };

    const seedAfterSync = (isSynced: boolean) => {
      if (!isSynced || seeded.current) {
        return;
      }

      seeded.current = true;
      if (slides.length === 0) {
        ydoc.transact(() => {
          slides.push([INITIAL_SLIDE_ID]);
          const initialSlide = getSlideText(ydoc, INITIAL_SLIDE_ID);
          if (initialSlide.length === 0) {
            initialSlide.insert(0, STARTER_SLIDE_HTML);
          }
        });
      }
      updateSlideIds();
    };

    updateSlideIds();
    slides.observe(updateSlideIds);
    provider.on("sync", seedAfterSync);
    seedAfterSync(provider.synced);

    return () => {
      slides.unobserve(updateSlideIds);
      provider.off("sync", seedAfterSync);
    };
  }, [room]);

  const addSlide = useCallback(() => {
    const provider = getYjsProviderForRoom(room);
    const ydoc = provider.getYDoc();
    const slides = ydoc.getArray<string>(SLIDES_ARRAY_KEY);
    const id = nanoid(8);

    ydoc.transact(() => {
      slides.push([id]);
      const ytext = getSlideText(ydoc, id);
      if (ytext.length === 0) {
        ytext.insert(0, EMPTY_SLIDE_HTML);
      }
    });

    return id;
  }, [room]);

  const deleteSlide = useCallback(
    (id: string) => {
      const provider = getYjsProviderForRoom(room);
      const ydoc = provider.getYDoc();
      const currentSlideIds = getSlideIds(ydoc);
      if (currentSlideIds.length <= 1) {
        return;
      }

      const slides = ydoc.getArray<string>(SLIDES_ARRAY_KEY);
      ydoc.transact(() => {
        const rawSlideIds = slides.toArray();
        for (let index = rawSlideIds.length - 1; index >= 0; index--) {
          if (rawSlideIds[index] === id) {
            slides.delete(index, 1);
          }
        }
      });
    },
    [room]
  );

  const moveSlide = useCallback(
    (fromIndex: number, toIndex: number) => {
      const provider = getYjsProviderForRoom(room);
      const ydoc = provider.getYDoc();
      const currentSlideIds = getSlideIds(ydoc);
      if (
        fromIndex === toIndex ||
        fromIndex < 0 ||
        toIndex < 0 ||
        fromIndex >= currentSlideIds.length ||
        toIndex >= currentSlideIds.length
      ) {
        return;
      }

      const movedId = currentSlideIds[fromIndex];
      const targetId = currentSlideIds[toIndex];
      const slides = ydoc.getArray<string>(SLIDES_ARRAY_KEY);

      ydoc.transact(() => {
        const sourceIndex = slides.toArray().indexOf(movedId);
        if (sourceIndex === -1) {
          return;
        }

        slides.delete(sourceIndex, 1);

        const rawSlideIds = slides.toArray();
        const targetIndex = rawSlideIds.indexOf(targetId);
        const insertIndex =
          targetIndex === -1
            ? rawSlideIds.length
            : fromIndex < toIndex
              ? targetIndex + 1
              : targetIndex;

        slides.insert(insertIndex, [movedId]);
      });
    },
    [room]
  );

  return { slideIds, addSlide, deleteSlide, moveSlide };
}

export function useSlideHtml(slideId: string, enabled = true): string {
  const room = useRoom();

  const readHtml = useCallback(() => {
    if (!enabled) {
      return STARTER_SLIDE_HTML;
    }
    const ydoc = getYjsProviderForRoom(room).getYDoc();
    return getSlideText(ydoc, slideId).toString() || STARTER_SLIDE_HTML;
  }, [enabled, room, slideId]);

  const [state, setState] = useState(() => ({ slideId, html: readHtml() }));

  // Recompute synchronously when the slide changes so consumers never render
  // one frame of the previous slide's HTML (the iframe srcDoc is set once per
  // slide, so a stale first value would stick). The fresh value must also be
  // returned from THIS render: a render-phase setState only applies on the
  // re-render, and this very render's value is what gets latched.
  let html = state.html;
  if (state.slideId !== slideId) {
    html = readHtml();
    setState({ slideId, html });
  }

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const ydoc = getYjsProviderForRoom(room).getYDoc();
    const ytext = getSlideText(ydoc, slideId);

    const updateHtml = () => {
      setState({ slideId, html: ytext.toString() || STARTER_SLIDE_HTML });
    };

    updateHtml();
    ytext.observe(updateHtml);

    return () => {
      ytext.unobserve(updateHtml);
    };
  }, [enabled, room, slideId]);

  return html;
}
