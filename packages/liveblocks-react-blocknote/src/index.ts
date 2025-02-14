import { detectDupes } from "@liveblocks/core";

import { PKG_FORMAT, PKG_NAME, PKG_VERSION } from "./version";

detectDupes(PKG_NAME, PKG_VERSION, PKG_FORMAT);


export { useLiveblocksExtension } from "./BlockNoteLiveblocksExtension";
export { AnchoredThreads } from "./comments/AnchoredThreads";
export { FloatingComposer } from "./comments/FloatingComposer";
export { FloatingThreads } from "./comments/FloatingThreads";
export { withLiveblocksEditorOptions } from "./initialization/liveblocksEditorOptions";
export { withLiveblocksSchema } from "./initialization/schema";
export { useCreateBlockNoteWithLiveblocks } from "./initialization/useCreateBlockNoteWithLiveblocks";
export { HistoryVersionPreview } from "./version-history/HistoryVersionPreview";

