declare const __VERSION__: string;
declare const TSUP_FORMAT: string;

export const PKG_NAME = "@liveblocks/nextjs";
export const PKG_VERSION = typeof __VERSION__ === "string" && __VERSION__;
export const PKG_FORMAT = typeof TSUP_FORMAT === "string" && TSUP_FORMAT;
