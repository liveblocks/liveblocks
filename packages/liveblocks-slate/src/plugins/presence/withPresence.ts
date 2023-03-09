import type {
  PresenceRequiredEditor,
  SlatePresence} from "./presenceEditor";
import {
  PresenceEditor
} from "./presenceEditor";

export type CreateWithPresenceOptions<TPresenceRangeField extends string> = {
  presenceSpanField: TPresenceRangeField;
};

export function createWithPresence<TPresenceRangeField extends string>({
  presenceSpanField,
}: CreateWithPresenceOptions<TPresenceRangeField>) {
  return <T extends PresenceRequiredEditor<TPresenceRangeField>>(
    editor: T
  ): T & PresenceEditor<TPresenceRangeField> => {
    const e = editor as T & PresenceEditor<TPresenceRangeField>;

    e.presenceSpanField = presenceSpanField;

    const { onChange } = e;
    e.onChange = () => {
      onChange();
      e.updatePresenceSpan(e.selection);
    };

    e.updatePresenceSpan = (range) => {
      const update: Partial<SlatePresence<TPresenceRangeField>> = {};
      update[e.presenceSpanField] = range
        ? [
            PresenceEditor.liveNodeId(e, range.anchor.path),
            PresenceEditor.liveNodeId(e, range.focus.path),
          ]
        : null;
      e.room.updatePresence(update);
    };

    return e;
  };
}
