// Declaring `import.meta.env` as a global type
declare global {
  interface ImportMetaEnv extends Record<string, string> {}
  interface ImportMeta {
    readonly env: ImportMetaEnv;
  }
}
type EnvConfig = {
  LIVEBLOCKS_BASE_URL: string;
  NEXT_PUBLIC_LIVEBLOCKS_BASE_URL: string;
  VITE_LIVEBLOCKS_BASE_URL: string;
};

export function getEnvVar<K extends keyof EnvConfig>(
  key: K
): EnvConfig[K] | undefined {
  switch (key) {
    case "LIVEBLOCKS_BASE_URL":
      return typeof process !== "undefined"
        ? process.env.LIVEBLOCKS_BASE_URL
        : undefined;
    case "NEXT_PUBLIC_LIVEBLOCKS_BASE_URL":
      return typeof process !== "undefined"
        ? process.env.NEXT_PUBLIC_LIVEBLOCKS_BASE_URL
        : undefined;
    case "VITE_LIVEBLOCKS_BASE_URL":
      return typeof import.meta !== "undefined" &&
        typeof import.meta.env !== "undefined"
        ? import.meta.env.VITE_LIVEBLOCKS_BASE_URL
        : undefined;
    default:
      return undefined;
  }
}
