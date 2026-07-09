import type { LiveFile, UploadFileOptions } from "@liveblocks/client";
import type { TLAssetStore } from "tldraw";

// Store a stable tldraw asset URL, then resolve it to a signed Liveblocks URL
// when tldraw renders the asset.
const LIVEBLOCKS_FILE_ASSET_SRC_PREFIX = "asset:";

export type LiveblocksAssetStore = TLAssetStore;

type LiveblocksFileRoom = {
  uploadFile(file: File, options?: UploadFileOptions): Promise<LiveFile>;
  getFileUrl(fileId: string): Promise<string>;
};

export function createLiveblocksAssetStore(
  room: LiveblocksFileRoom
): LiveblocksAssetStore {
  return {
    async upload(_asset, file, abortSignal) {
      const liveFile = await room.uploadFile(file, { signal: abortSignal });

      return {
        src: getLiveblocksFileAssetSrc(liveFile.id),
      };
    },
    resolve(asset) {
      const fileId = getLiveblocksFileIdFromAssetSrc(asset.props.src);
      if (fileId) {
        return room.getFileUrl(fileId);
      }

      return asset.props.src;
    },
  };
}

function getLiveblocksFileAssetSrc(fileId: string) {
  return `${LIVEBLOCKS_FILE_ASSET_SRC_PREFIX}${fileId}`;
}

function getLiveblocksFileIdFromAssetSrc(src: string | null | undefined) {
  if (!src?.startsWith(LIVEBLOCKS_FILE_ASSET_SRC_PREFIX)) {
    return undefined;
  }

  return src.slice(LIVEBLOCKS_FILE_ASSET_SRC_PREFIX.length) || undefined;
}
