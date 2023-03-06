export { HistoryEditor } from "./plugins/history/historyEditor";
export { withHistory } from "./plugins/history/withHistory";

export { LiveblocksEditor } from "./plugins/liveblocks/liveblocksEditor";
export { createWithLiveblocks } from "./plugins/liveblocks/withLiveblocks";

export type { CreateWithLiveblocksOptions } from "./plugins/liveblocks/withLiveblocks";
export { PresenceEditor } from "./plugins/presence/presenceEditor";
export type {
  PresenceRequiredEditor,
  SlatePresence,
} from "./plugins/presence/presenceEditor";

export { createWithPresence } from "./plugins/presence/withPresence";
export type { CreateWithPresenceOptions } from "./plugins/presence/withPresence";

export { isLiveElement, isLiveRoot, isLiveText } from "./types";
export type {
  LiveDescendant,
  LiveElement,
  LiveNode,
  LiveParent,
  LiveRoot,
  LiveText,
  LsonElement,
  LsonText,
} from "./types";

export { lsonToSlateNode, slateRootToLiveRoot } from "./utils/convert";
