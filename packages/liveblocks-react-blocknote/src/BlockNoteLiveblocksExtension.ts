import { useLiveblocksExtension as useTipTapLiveblocksExtension } from "@liveblocks/react-tiptap";
import type { Mark } from "@tiptap/core";

export type LiveblocksExtensionOptions = Parameters<
  typeof useTipTapLiveblocksExtension
>[0];

export const useLiveblocksExtension = (
  options: LiveblocksExtensionOptions = {}
) => {
  const extension = useTipTapLiveblocksExtension({
    ...options,
    // @ts-expect-error - Hidden config option
    textEditorType: "blocknote",
  });

  extension.config.extendMarkSchema = (mark: Mark) => {
    if (mark.name === "liveblocksCommentMark") {
      return {
        blocknoteIgnore: true,
      };
    }
    return {};
  };

  return extension;
};
