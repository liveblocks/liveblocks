import type { Extension } from "@tiptap/core";

import { useLiveblocksExtension as useTipTapLiveblocksExtension } from "@liveblocks/react-tiptap";

export const useLiveblocksExtension = (): Extension => {
  const extension = useTipTapLiveblocksExtension();

  return extension.extend({
    addExtensions() {
      const ret = this.parent?.() ?? [];

      // filter out the liveblocks mention extension, because this will be added via the schema instead of as an extension (see schema.ts)
      return ret.filter((ext) => ext.name !== "liveblocksMention");
    },
  });
};
