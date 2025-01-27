type EnvConfig = {
  LIVEBLOCKS_BASE_URL: string;
  NEXT_PUBLIC_LIVEBLOCKS_BASE_URL: string;
  VITE_LIVEBLOCKS_BASE_URL: string;
};

const getProcessEnv = (): Record<string, string> | undefined => {
  try {
    const parts = ["process", ".env"];
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-implied-eval
    return new Function("return " + parts.join(""))();
  } catch {
    return undefined;
  }
};

const getImportMeta = (): Record<string, string> | undefined => {
  try {
    // Split the string to prevent parser from detecting it
    const parts = ["import", ".meta", ".env"];
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-implied-eval
    return new Function("return " + parts.join(""))();
  } catch {
    return undefined;
  }
};

export function getEnvVar<K extends keyof EnvConfig>(
  key: K
): EnvConfig[K] | undefined {
  switch (key) {
    case "LIVEBLOCKS_BASE_URL": {
      const processEnv = getProcessEnv();
      if (processEnv) {
        return processEnv.LIVEBLOCKS_BASE_URL ?? undefined;
      }

      return undefined;
    }
    case "NEXT_PUBLIC_LIVEBLOCKS_BASE_URL": {
      const processEnv = getProcessEnv();
      if (processEnv) {
        return processEnv.NEXT_PUBLIC_LIVEBLOCKS_BASE_URL ?? undefined;
      }

      return undefined;
    }
    case "VITE_LIVEBLOCKS_BASE_URL": {
      const importMetaEnv = getImportMeta();
      if (importMetaEnv) {
        return importMetaEnv.VITE_LIVEBLOCKS_BASE_URL ?? undefined;
      }

      return undefined;
    }
    default:
      return undefined;
  }
}
