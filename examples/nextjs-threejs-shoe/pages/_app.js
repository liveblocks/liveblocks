import { LiveblocksProvider, RoomProvider } from "@liveblocks/react";
import { createClient } from "@liveblocks/client";

const client = createClient({
  publicApiKey: process.env.NEXT_PUBLIC_LIVEBLOCKS_PUBLIC_KEY,
});

function MyApp({ Component, pageProps }) {
  return (
    /**
     * Add a LiveblocksProvider at the root of your app
     * to be able to use Liveblocks react hooks in your components
     **/
    <LiveblocksProvider client={client}>
      <RoomProvider id="3d-shoe">
        <Component {...pageProps} />
      </RoomProvider>
    </LiveblocksProvider>
  );
}
export default MyApp;
