declare const __VERSION__: string;
declare const ROLLUP_FORMAT: string;

export const PKG_NAME = "@liveblocks/react-lexical";
export const PKG_VERSION = typeof __VERSION__ === "string" && __VERSION__;
export const PKG_FORMAT = typeof ROLLUP_FORMAT === "string" && ROLLUP_FORMAT;
