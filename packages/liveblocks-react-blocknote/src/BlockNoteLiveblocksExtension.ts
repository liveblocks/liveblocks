
import { useLiveblocksExtension as useTipTapLiveblocksExtension } from "@liveblocks/react-tiptap";

export type LiveblocksExtensionOptions = Parameters<ReturnType<typeof useTipTapLiveblocksExtension>["configure"]>[0];

export const useLiveblocksExtension = (options: LiveblocksExtensionOptions = {}) => {
  const extension = useTipTapLiveblocksExtension();

  return extension.extend({
    addExtensions() {
      const ret = this.parent?.() ?? [];

      // filter out the liveblocks mention extension, because this will be added via the schema instead of as an extension (see schema.ts)
      return ret.filter((ext) => ext.name !== "liveblocksMention");
    },
  }).configure(options);
};
