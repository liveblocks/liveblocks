import type { Room } from "@liveblocks/client";
import { BaseRange, Path, Span } from "slate";
import type { LiveNode, LiveRoot } from "../../types";
import { getLiveNode } from "../../utils/getLiveNode";
import { getSlatePath } from "../../utils/getSlatePath";
import { LiveblocksEditor } from "../liveblocks/liveblocksEditor";

export type SlatePresence<TPresenceRangeField extends string> = {
  [key in TPresenceRangeField]: [string, string] | null;
};

export type PresenceRequiredEditor<TPresenceRangeField extends string> =
  LiveblocksEditor<Room<SlatePresence<TPresenceRangeField>, {}, {}, {}>>;

export type PresenceEditor<TPresenceRangeField extends string = string> =
  PresenceRequiredEditor<TPresenceRangeField> & {
    presenceSpanField: TPresenceRangeField;
    updatePresenceSpan: (range: BaseRange | null) => void;
  };

type InternalLiveNodeApi = {
  _id: string;
  __pool: { getNode(id: string): LiveNode | undefined };
};

export const PresenceEditor = {
  isPresenceEditor(v: unknown): v is PresenceEditor {
    return LiveblocksEditor.isLiveblocksEditor(v) && "presenceSpanField" in v;
  },

  getPath<TPresenceField extends string>(
    editor: PresenceEditor<TPresenceField>,
    liveNodeId: string
  ): Path | undefined {
    const pool = (editor.liveRoot as LiveRoot & InternalLiveNodeApi).__pool;
    const liveNode = pool.getNode(liveNodeId);
    if (!liveNode) {
      return undefined;
    }

    return getSlatePath(editor.liveRoot, liveNode);
  },

  liveNodeId<TPresenceField extends string>(
    editor: PresenceEditor<TPresenceField>,
    path: Path
  ): string {
    const liveNode = getLiveNode(editor.liveRoot, path);
    return (liveNode as LiveNode & InternalLiveNodeApi)._id;
  },

  presenceSpans<TPresenceField extends string>(
    editor: PresenceEditor<TPresenceField>
  ): Map<number, Span | null> {
    const others = editor.room.getOthers();
    const connected = LiveblocksEditor.isConnected(editor);

    return new Map(
      others.map(({ connectionId, presence }) => {
        const presenceSpan = presence[editor.presenceSpanField];
        const anchor =
          presenceSpan && PresenceEditor.getPath(editor, presenceSpan[0]);
        const focus =
          presenceSpan && PresenceEditor.getPath(editor, presenceSpan[1]);
        if (!(anchor && focus && connected)) {
          return [connectionId, null];
        }

        // Slate spans should always be [start, end] not [anchor, focus]
        const span: Span = Path.isBefore(anchor, focus)
          ? [anchor, focus]
          : [focus, anchor];

        return [connectionId, span] as const;
      })
    );
  },

  presenceSpan<TPresenceField extends string>(
    editor: PresenceEditor<TPresenceField>,
    connectionId: string
  ): Span | null {
    if (!LiveblocksEditor.isConnected(editor)) {
      return null;
    }

    const span = editor.room
      .getOthers()
      .find((o) => o.connectionId.toString() === connectionId)?.presence[
      editor.presenceSpanField
    ];

    const anchor = span && PresenceEditor.getPath(editor, span[0]);
    const focus = span && PresenceEditor.getPath(editor, span[1]);
    if (!(anchor && focus)) {
      return null;
    }

    // Slate spans should always be [start, end] not [anchor, focus]
    return Path.isBefore(anchor, focus) ? [anchor, focus] : [focus, anchor];
  },

  updatePresenceSpan<TPresenceField extends string>(
    editor: PresenceEditor<TPresenceField>,
    range: BaseRange | null
  ): void {
    editor.updatePresenceSpan(range);
  },
};
