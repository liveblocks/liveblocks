const get = (fn: () => string | undefined): string | undefined => {
  try {
    return fn();
  } catch {
    return undefined;
  }
};

export function getBaseUrlFromEnvVar(): string | undefined {
  return (
    get(() => process.env.LIVEBLOCKS_BASE_URL) ??
    get(() => process.env.NEXT_PUBLIC_LIVEBLOCKS_BASE_URL) ??
    get(
      () =>
        (
          import.meta as ImportMeta & {
            env: Record<string, string | undefined>;
          }
        ).env.VITE_LIVEBLOCKS_BASE_URL
    )
  );
}
