import type { Client } from "@liveblocks/client";
import * as React from "react";

type LiveblocksProviderProps = {
  children: React.ReactNode;
  client: Client;
};

const ClientContext = React.createContext<Client | null>(null);

/**
 * Makes the Liveblocks client available in the component hierarchy below.
 */
export function LiveblocksProvider(
  props: LiveblocksProviderProps
): JSX.Element {
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
