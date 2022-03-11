import create from "zustand";
import { nanoid } from "nanoid";
import React from "react";
import {
  initialLayers,
  createRandomRectangle,
  createRandomEllipse,
} from "./utils";
import { Layer } from "./types";

import { createClient } from "@liveblocks/client";
import { middleware } from "@liveblocks/zustand";

const client = createClient({
  publicApiKey: process.env.NEXT_PUBLIC_LIVEBLOCKS_PUBLIC_KEY!,
});

interface State {
  cursor: {
    x: number;
    y: number;
  } | null;
  isDragging: boolean;
  selectedLayerId: string | null;

  layers: Record<string, Layer>;

  onCanvasPointerUp: () => void;
  onCanvasPointerMove: (e: React.PointerEvent) => void;
  onKeyDown: (e: KeyboardEvent) => void;
  onDocumentPointerLeave: (e: PointerEvent) => void;
  onLayerPointerDown: (id: string, e: React.PointerEvent) => void;
}

interface Presence {
  cursor?: { x: number; y: number };
}

const useStore = create(
  middleware<State, Presence>(
    (set, get) => ({
      layers: initialLayers,
      isDragging: false,
      cursor: null,
      selectedLayerId: null,

      onLayerPointerDown: (id: string, e: React.PointerEvent) => {
        // Access to underlying room API to pause history before starting a drag
        get().liveblocks.room?.history.pause();
        set({
          cursor: { x: e.clientX, y: e.clientY },
          selectedLayerId: id,
          isDragging: true,
        });
      },

      onCanvasPointerUp: () => {
        set({
          isDragging: false,
        });
        // Access to underlying room API to resume history after ending a drag
        get().liveblocks.room?.history.resume();
      },

      onDocumentPointerLeave: (e: PointerEvent) => {
        set({
          cursor: null,
        });
      },

      onKeyDown: (e) => {
        const { layers, selectedLayerId } = get();

        switch (e.key) {
          case "r": {
            const id = nanoid();
            set({
              selectedLayerId: id,
              layers: {
                ...layers,
                [id]: createRandomRectangle(),
              },
            });
            break;
          }
          case "o": {
            const id = nanoid();
            set({
              selectedLayerId: id,
              layers: {
                ...layers,
                [id]: createRandomEllipse(),
              },
            });
            break;
          }
          case "Backspace": {
            if (selectedLayerId == null) {
              return;
            }

            const { [selectedLayerId]: value, ...newLayers } = layers;
            set({
              layers: newLayers,
            });
            break;
          }
          default:
            break;
        }
      },

      onCanvasPointerMove: (e) => {
        const { layers, selectedLayerId, cursor, isDragging } = get();

        if (
          selectedLayerId == null ||
          layers[selectedLayerId] == null ||
          cursor == null ||
          !isDragging
        ) {
          set({ cursor: { x: e.clientX, y: e.clientY } });
          return;
        }

        const offsetX = e.clientX - cursor.x;
        const offsetY = e.clientY - cursor.y;

        const selectedLayer = layers[selectedLayerId];

        set({
          cursor: { x: e.clientX, y: e.clientY },
          layers: {
            ...layers,
            [selectedLayerId]: {
              ...selectedLayer,
              x: selectedLayer.x + offsetX,
              y: selectedLayer.y + offsetY,
            },
          },
        });
      },
    }),
    {
      client,
      storageMapping: { layers: true },
      presenceMapping: { cursor: true },
    }
  )
);

export default useStore;
