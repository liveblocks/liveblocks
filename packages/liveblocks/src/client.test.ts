import { createClient } from "./";

const client = createClient({
  authEndpoint: "",
});

client.enter("roomA", { defaultPresence: { cursor: { x: 0, y: 0 } } });
