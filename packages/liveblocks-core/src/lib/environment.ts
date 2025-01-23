// Declaring `import.meta.env` as a global type
declare global {
  interface ImportMeta {
    readonly env: Record<string, string>;
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
      return process.env.LIVEBLOCKS_BASE_URL;
    case "NEXT_PUBLIC_LIVEBLOCKS_BASE_URL":
      return process.env.NEXT_PUBLIC_LIVEBLOCKS_BASE_URL;
    case "VITE_LIVEBLOCKS_BASE_URL":
      return import.meta.env.VITE_LIVEBLOCKS_BASE_URL;
    default:
      return undefined;
  }
}
