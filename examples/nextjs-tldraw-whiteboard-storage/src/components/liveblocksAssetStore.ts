import {
  LiveMap,
  type LiveFile,
  type UploadFileOptions,
} from "@liveblocks/client";
import type { TLAssetStore } from "tldraw";

// Store a stable tldraw asset URL, then resolve it to a signed Liveblocks URL
// when tldraw renders the asset.
const LIVEBLOCKS_FILE_ASSET_SRC_PREFIX = "asset:liveblocks-file:";

export type LiveblocksAssetStore = TLAssetStore;

type LiveblocksFileStorageRoot = {
  get(key: "files"): LiveMap<string, LiveFile> | undefined;
  set(key: "files", value: LiveMap<string, LiveFile>): void;
};

type LiveblocksFileRoom = {
  getFileUrl(file: LiveFile | string): Promise<string>;
  getStorage(): Promise<{ root: LiveblocksFileStorageRoot }>;
};

export function createLiveblocksAssetStore(
  room: LiveblocksFileRoom,
  uploadFile: (file: File, options?: UploadFileOptions) => Promise<LiveFile>
): LiveblocksAssetStore {
  return {
    async upload(asset, file, abortSignal) {
      const liveFile = await uploadFile(file, { signal: abortSignal });
      const liveFiles = await getLiveFiles(room);
      liveFiles.set(asset.id, liveFile);

      return {
        src: getLiveblocksFileAssetSrc(asset.id),
      };
    },
    async resolve(asset) {
      const assetId = getLiveblocksFileAssetIdFromAssetSrc(asset.props.src);
      if (assetId) {
        const liveFiles = await getLiveFiles(room);
        const liveFile = liveFiles.get(assetId);
        return liveFile ? room.getFileUrl(liveFile) : null;
      }

      return asset.props.src;
    },
    async remove(assetIds) {
      const { root } = await room.getStorage();
      const liveFiles = root.get("files");
      if (!liveFiles) {
        return;
      }

      for (const assetId of assetIds) {
        liveFiles.delete(assetId);
      }
    },
  };
}

async function getLiveFiles(room: LiveblocksFileRoom) {
  const { root } = await room.getStorage();
  const liveFiles = root.get("files");
  if (liveFiles) {
    return liveFiles;
  }

  const nextLiveFiles = new LiveMap<string, LiveFile>();
  root.set("files", nextLiveFiles);
  return nextLiveFiles;
}

function getLiveblocksFileAssetSrc(assetId: string) {
  return `${LIVEBLOCKS_FILE_ASSET_SRC_PREFIX}${assetId}`;
}

function getLiveblocksFileAssetIdFromAssetSrc(src: string | null | undefined) {
  if (!src?.startsWith(LIVEBLOCKS_FILE_ASSET_SRC_PREFIX)) {
    return undefined;
  }

  return src.slice(LIVEBLOCKS_FILE_ASSET_SRC_PREFIX.length) || undefined;
}
