"use client";

import type { PropsWithChildren } from "react";
import { createContext, useContext, useMemo } from "react";

import { type Components, ComponentsProvider } from "./components";
import type { Overrides } from "./overrides";
import { OverridesProvider } from "./overrides";

type LiveblocksUiConfigProps = PropsWithChildren<{
  /**
   * Override the components' strings.
   */
  overrides?: Partial<Overrides>;

  /**
   * Override the components' components.
   */
  components?: Partial<Components>;

  /**
   * The container to render the portal into.
   */
  portalContainer?: HTMLElement;

  /**
   * When `preventUnsavedChanges` is set on your Liveblocks client (or set on
   * <LiveblocksProvider>), then closing a browser tab will be prevented when
   * there are unsaved changes.
   *
   * By default, that will include draft texts or attachments that are (being)
   * uploaded via comments/threads composers, but not submitted yet.
   *
   * If you want to prevent unsaved changes with Liveblocks, but not for
   * composers, you can opt-out by setting this option to `false`.
   */
  preventUnsavedComposerChanges?: boolean;

  /**
   * The Liveblocks emoji picker (visible when adding reactions in `Comment`) is built with
   * {@link https://github.com/liveblocks/frimousse | Frimousse}, which fetches its data from
   * {@link https://emojibase.dev/docs/datasets/ | Emojibase}.
   *
   * This option allows you to change the base URL of where the {@link https://www.npmjs.com/package/emojibase-data | `emojibase-data`}
   * files should be fetched from, used as follows: `${emojibaseUrl}/${locale}/${file}.json`.
   * (e.g. `${emojibaseUrl}/en/data.json`).
   *
   * @example "https://unpkg.com/emojibase-data"
   *
   * @example "https://example.com/self-hosted-emojibase-data"
   */
  emojibaseUrl?: string;
}>;

interface LiveblocksUiConfigContext {
  portalContainer?: HTMLElement;
  preventUnsavedComposerChanges?: boolean;
  emojibaseUrl?: string;
}

const LiveblocksUiConfigContext = createContext<LiveblocksUiConfigContext>({});

export function useLiveblocksUiConfig() {
  return useContext(LiveblocksUiConfigContext);
}

/**
 * Set configuration options for all components.
 *
 * @example
 * <LiveblocksUiConfig overrides={{ locale: "fr", USER_UNKNOWN: "Anonyme", ... }}>
 *   <App />
 * </LiveblocksUiConfig>
 */
export function LiveblocksUiConfig({
  overrides,
  components,
  portalContainer,
  preventUnsavedComposerChanges = true,
  emojibaseUrl,
  children,
}: LiveblocksUiConfigProps) {
  const liveblocksUiConfig = useMemo(
    () => ({
      portalContainer,
      preventUnsavedComposerChanges,
      emojibaseUrl,
    }),
    [portalContainer, preventUnsavedComposerChanges, emojibaseUrl]
  );

  return (
    <LiveblocksUiConfigContext.Provider value={liveblocksUiConfig}>
      <OverridesProvider overrides={overrides}>
        <ComponentsProvider components={components}>
          {children}
        </ComponentsProvider>
      </OverridesProvider>
    </LiveblocksUiConfigContext.Provider>
  );
}
