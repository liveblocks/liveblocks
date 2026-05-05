declare const __VERSION__: string;
declare const __FORMAT__: string;

export const PKG_NAME = "@liveblocks/zustand";
export const PKG_VERSION = typeof __VERSION__ === "string" && __VERSION__;
export const PKG_FORMAT = typeof __FORMAT__ === "string" && __FORMAT__;
