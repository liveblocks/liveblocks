import Highlight from "@tiptap/extension-highlight";
import TextAlign from "@tiptap/extension-text-align";
import Typography from "@tiptap/extension-typography";
import { Placeholder } from "@tiptap/extensions";
import StarterKit from "@tiptap/starter-kit";

/**
 * The Tiptap extensions shared by the live editor and the read-only version
 * previews, so both render the same schema.
 */
export function getBaseExtensions({ editable }: { editable: boolean }) {
  return [
    StarterKit.configure({
      // The Liveblocks extension comes with its own history handling.
      undoRedo: false,
      link: { openOnClick: false },
    }),
    Typography,
    Highlight,
    TextAlign.configure({ types: ["heading", "paragraph"] }),
    ...(editable
      ? [
          Placeholder.configure({
            placeholder: "Start writing, or ask the AI in the chat…",
          }),
        ]
      : []),
  ];
}
