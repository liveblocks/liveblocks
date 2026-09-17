import StarterKit from "@tiptap/starter-kit";

/**
 * The Tiptap extensions that define a document's schema. Shared by the
 * editor in the side panel and by the server, which converts the agent's
 * Markdown into the same node types before writing it to Storage.
 */
export const DOCUMENT_EXTENSIONS = [
  StarterKit.configure({
    // The Liveblocks extension has its own history in Storage mode
    undoRedo: false,
  }),
];
