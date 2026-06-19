import {
  EditorSelection,
  StateEffect,
  StateField,
  Transaction,
  type Extension,
} from "@codemirror/state";
import {
  Direction,
  EditorView,
  layer,
  type LayerMarker,
  RectangleMarker,
  ViewPlugin,
  ViewUpdate,
} from "@codemirror/view";
import type { LiveObject, LsonObject, Room } from "@liveblocks/client";
import { kInternal, LiveText } from "@liveblocks/core";

import { clamp } from "./utils";

type RemoteSelection = {
  connectionId: number;
  anchor: number;
  head: number;
  name?: string;
  color?: string;
};

type LiveblocksCodemirrorPresence = {
  selection: {
    anchor: number;
    head: number;
    version: number;
  } | null;
};

type LiveblocksCodemirrorUserMeta = {
  id?: string;
  info?: {
    name?: string;
    color?: string;
  };
};

class RemoteSelectionMarker implements LayerMarker {
  constructor(
    readonly left: number,
    readonly top: number,
    readonly width: number,
    readonly height: number,
    readonly color: string
  ) {}

  eq(other: LayerMarker): boolean {
    return (
      other instanceof RemoteSelectionMarker &&
      other.left === this.left &&
      other.top === this.top &&
      other.width === this.width &&
      other.height === this.height &&
      other.color === this.color
    );
  }

  draw(): HTMLElement {
    const element = document.createElement("div");
    element.className = "lb-remote-selection";
    element.style.setProperty("--lb-remote-color", this.color);
    element.style.left = `${this.left}px`;
    element.style.top = `${this.top}px`;
    element.style.width = `${this.width}px`;
    element.style.height = `${this.height}px`;
    return element;
  }

  update(element: HTMLElement, prev: LayerMarker): boolean {
    if (!(prev instanceof RemoteSelectionMarker)) return false;
    if (prev.color !== this.color) return false;
    element.style.left = `${this.left}px`;
    element.style.top = `${this.top}px`;
    element.style.width = `${this.width}px`;
    element.style.height = `${this.height}px`;
    return true;
  }
}

class RemoteCaretMarker implements LayerMarker {
  constructor(
    readonly left: number,
    readonly top: number,
    readonly height: number,
    readonly selection: RemoteSelection
  ) {}

  eq(other: LayerMarker): boolean {
    return (
      other instanceof RemoteCaretMarker &&
      other.selection.connectionId === this.selection.connectionId &&
      other.left === this.left &&
      other.top === this.top &&
      other.height === this.height &&
      other.selection.color === this.selection.color
    );
  }

  draw(): HTMLElement {
    const element = document.createElement("div");
    element.className = "lb-remote-caret";
    element.style.setProperty(
      "--lb-remote-color",
      this.selection.color ?? "#888888"
    );
    element.style.left = `${this.left}px`;
    element.style.top = `${this.top}px`;
    element.style.height = `${this.height}px`;
    element.setAttribute("aria-hidden", "true");

    return element;
  }

  update(element: HTMLElement, prev: LayerMarker): boolean {
    if (!(prev instanceof RemoteCaretMarker)) return false;
    if (prev.selection.connectionId !== this.selection.connectionId)
      return false;
    element.style.setProperty(
      "--lb-remote-color",
      this.selection.color ?? "#888888"
    );
    element.style.left = `${this.left}px`;
    element.style.top = `${this.top}px`;
    element.style.height = `${this.height}px`;
    return true;
  }
}

export function createLiveblocksPresencePlugin(
  room: Room<
    LiveblocksCodemirrorPresence,
    LsonObject,
    LiveblocksCodemirrorUserMeta
  >,
  root: LiveObject<{ document: LiveText }>
): Extension[] {
  const upsertRemoteSelections = StateEffect.define<Array<RemoteSelection>>();
  const removeRemoteSelections = StateEffect.define<Set<number>>();

  const remoteSelectionsState = StateField.define<Array<RemoteSelection>>({
    create(state) {
      const document = root.get("document");
      const selections: RemoteSelection[] = [];

      for (const user of room.getOthers()) {
        const presenceSelection = user.presence.selection;
        if (presenceSelection == null) continue;

        const anchor = document[kInternal].decodeIndex(
          presenceSelection.anchor,
          presenceSelection.version
        );
        const head = document[kInternal].decodeIndex(
          presenceSelection.head,
          presenceSelection.version
        );
        if (head === null || anchor === null) continue;

        selections.push({
          connectionId: user.connectionId,
          anchor: clamp(anchor, { min: 0, max: state.doc.length }),
          head: clamp(head, { min: 0, max: state.doc.length }),
          name: user.info?.name,
          color: user.info?.color,
        });
      }

      return selections;
    },
    update(selections, tr) {
      let nextSelections = selections;

      if (tr.docChanged) {
        nextSelections = nextSelections.map((selection) => ({
          ...selection,
          anchor: clamp(tr.changes.mapPos(selection.anchor, 1), {
            min: 0,
            max: tr.newDoc.length,
          }),
          head: clamp(tr.changes.mapPos(selection.head, 1), {
            min: 0,
            max: tr.newDoc.length,
          }),
        }));
      }

      for (const effect of tr.effects) {
        if (effect.is(upsertRemoteSelections)) {
          nextSelections = [
            ...new Map(
              [...nextSelections, ...effect.value].map((sel) => [
                sel.connectionId,
                {
                  ...sel,
                  anchor: clamp(sel.anchor, {
                    min: 0,
                    max: tr.newDoc.length,
                  }),
                  head: clamp(sel.head, { min: 0, max: tr.newDoc.length }),
                },
              ])
            ).values(),
          ];
        } else if (effect.is(removeRemoteSelections)) {
          nextSelections = nextSelections.filter(
            (selection) => !effect.value.has(selection.connectionId)
          );
        }
      }

      return nextSelections;
    },
  });

  function createRemoteSelectionMarkers(view: EditorView): LayerMarker[] {
    const selections = view.state.field(remoteSelectionsState);
    const markers: LayerMarker[] = [];

    for (const selection of selections) {
      const from = clamp(Math.min(selection.anchor, selection.head), {
        min: 0,
        max: view.state.doc.length,
      });
      const to = clamp(Math.max(selection.anchor, selection.head), {
        min: 0,
        max: view.state.doc.length,
      });
      if (from === to) continue;

      const color = selection.color ?? "#888888";
      for (const rect of RectangleMarker.forRange(
        view,
        "lb-remote-selection",
        EditorSelection.range(from, to)
      )) {
        if (rect.width === null) continue;
        markers.push(
          new RemoteSelectionMarker(
            rect.left,
            rect.top,
            rect.width,
            rect.height,
            color
          )
        );
      }
    }

    return markers;
  }

  function createRemoteCaretMarkers(view: EditorView): LayerMarker[] {
    const selections = view.state.field(remoteSelectionsState);
    const markers: LayerMarker[] = [];
    const scrollRect = view.scrollDOM.getBoundingClientRect();
    const originLeft =
      (view.textDirection === Direction.LTR
        ? scrollRect.left
        : scrollRect.right - view.scrollDOM.clientWidth * view.scaleX) -
      view.scrollDOM.scrollLeft * view.scaleX;
    const originTop = scrollRect.top - view.scrollDOM.scrollTop * view.scaleY;

    for (const selection of selections) {
      const head = clamp(selection.head, {
        min: 0,
        max: view.state.doc.length,
      });
      const coords = view.coordsAtPos(head, head <= selection.anchor ? -1 : 1);
      if (coords === null) continue;

      markers.push(
        new RemoteCaretMarker(
          coords.left - originLeft,
          coords.top - originTop,
          coords.bottom - coords.top,
          selection
        )
      );
    }

    return markers;
  }

  const shouldRedrawRemotePresence = (update: ViewUpdate) =>
    update.docChanged ||
    update.viewportChanged ||
    update.geometryChanged ||
    update.transactions.some((tr) =>
      tr.effects.some(
        (effect) =>
          effect.is(upsertRemoteSelections) || effect.is(removeRemoteSelections)
      )
    );

  return [
    remoteSelectionsState,
    layer({
      above: false,
      class: "lb-remote-selectionLayer",
      markers: createRemoteSelectionMarkers,
      update: shouldRedrawRemotePresence,
    }),
    layer({
      above: true,
      class: "lb-remote-caretLayer",
      markers: createRemoteCaretMarkers,
      update: shouldRedrawRemotePresence,
    }),
    ViewPlugin.fromClass(
      class {
        private pendingSelectionsByConnectionId = new Map<
          number,
          {
            anchor: number;
            head: number;
            version: number;
            name?: string;
            color?: string;
          }
        >();
        private unsubscribeFromPresenceUpdates: () => void;
        private unsubscribeFromStorageUpdates: () => void;

        constructor(private view: EditorView) {
          this.unsubscribeFromStorageUpdates = room.subscribe(
            root,
            () => {
              if (this.pendingSelectionsByConnectionId.size === 0) {
                return;
              }
              const document = root.get("document");
              const rebasedSelection: Array<RemoteSelection> = [];
              for (const [
                connectionId,
                selection,
              ] of this.pendingSelectionsByConnectionId.entries()) {
                const anchor = document[kInternal].decodeIndex(
                  selection.anchor,
                  selection.version
                );
                const head = document[kInternal].decodeIndex(
                  selection.head,
                  selection.version
                );
                if (anchor === null || head === null) continue;

                this.pendingSelectionsByConnectionId.delete(connectionId);
                rebasedSelection.push({
                  connectionId,
                  anchor,
                  head,
                  name: selection.name,
                  color: selection.color,
                });
              }
              if (rebasedSelection.length > 0) {
                this.view.dispatch({
                  effects: upsertRemoteSelections.of(rebasedSelection),
                });
              }
            },
            { isDeep: true }
          );

          this.unsubscribeFromPresenceUpdates = room.subscribe(
            "others",
            (others) => {
              const rebasedSelection: Array<RemoteSelection> = [];
              const connections = new Set<number>();
              const connectionIdsToRemove = new Set<number>();

              const document = root.get("document");

              for (const user of others) {
                connections.add(user.connectionId);
                if (user.presence.selection === null) {
                  this.pendingSelectionsByConnectionId.delete(
                    user.connectionId
                  );
                  connectionIdsToRemove.add(user.connectionId);
                  continue;
                }

                const anchor = document[kInternal].decodeIndex(
                  user.presence.selection.anchor,
                  user.presence.selection.version
                );
                const head = document[kInternal].decodeIndex(
                  user.presence.selection.head,
                  user.presence.selection.version
                );
                if (head === null || anchor === null) {
                  this.pendingSelectionsByConnectionId.set(user.connectionId, {
                    anchor: user.presence.selection.anchor,
                    head: user.presence.selection.head,
                    version: user.presence.selection.version,
                    name: user.info?.name,
                    color: user.info?.color,
                  });
                  continue;
                }

                this.pendingSelectionsByConnectionId.delete(user.connectionId);
                rebasedSelection.push({
                  connectionId: user.connectionId,
                  anchor,
                  head,
                  name: user.info?.name,
                  color: user.info?.color,
                });
              }

              for (const selection of this.view.state.field(
                remoteSelectionsState
              )) {
                if (!connections.has(selection.connectionId)) {
                  connectionIdsToRemove.add(selection.connectionId);
                }
              }
              for (const connectionId of this.pendingSelectionsByConnectionId.keys()) {
                if (!connections.has(connectionId)) {
                  this.pendingSelectionsByConnectionId.delete(connectionId);
                  connectionIdsToRemove.add(connectionId);
                }
              }

              const effects: Array<
                StateEffect<Array<RemoteSelection> | Set<number>>
              > = [];

              if (rebasedSelection.length > 0) {
                effects.push(upsertRemoteSelections.of(rebasedSelection));
              }
              if (connectionIdsToRemove.size > 0) {
                effects.push(removeRemoteSelections.of(connectionIdsToRemove));
              }
              if (effects.length > 0) {
                this.view.dispatch({ effects });
              }
            }
          );
        }

        update(update: ViewUpdate) {
          if (!update.selectionSet && !update.docChanged) return;
          if (
            update.transactions.some((tr) => tr.annotation(Transaction.remote))
          ) {
            return;
          }
          const document = root.get("document");
          const selection = this.view.state.selection.main;
          const encodedAnchor = document[kInternal].encodeIndex(
            selection.anchor
          );
          const encodedHead =
            selection.head === selection.anchor
              ? encodedAnchor
              : document[kInternal].encodeIndex(selection.head);
          room.updatePresence({
            selection: {
              anchor: encodedAnchor,
              head: encodedHead,
              version: document.version,
            },
          });
        }

        destroy() {
          this.unsubscribeFromPresenceUpdates();
          this.unsubscribeFromStorageUpdates();
          room.updatePresence({ selection: null });
        }
      }
    ),
  ];
}
