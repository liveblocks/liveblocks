import type { Client } from "@liveblocks/client";
import { deprecate } from "@liveblocks/client/internal";
import * as React from "react";

type LiveblocksProviderProps = {
  children: React.ReactNode;
  client: Client;
};

const ClientContext = React.createContext<Client | null>(null);

/**
 * Makes the Liveblocks client available in the component hierarchy below.
 *
 * @deprecated LiveblocksProvider is no longer needed in your component tree if
 * you set up your Liveblocks context using `createRoomContext()`. See
 * https://gist.github.com/nvie/5e718902c51ea7dad93cd6952fe1af03 for details.
 */
export function LiveblocksProvider(
  props: LiveblocksProviderProps
): JSX.Element {
  deprecate(
    "LiveblocksProvider is no longer needed in your component tree if you set up your Liveblocks context using `createRoomContext()`. See https://gist.github.com/nvie/5e718902c51ea7dad93cd6952fe1af03 for details."
  );
  return (
    <ClientContext.Provider value={props.client}>
      {props.children}
    </ClientContext.Provider>
  );
}

/**
 * Returns the Client of the nearest LiveblocksProvider above in the React
 * component tree.
 */
export function useClient(): Client {
  const client = React.useContext(ClientContext);
  if (client == null) {
    throw new Error("LiveblocksProvider is missing from the react tree");
  }

  return client;
}
