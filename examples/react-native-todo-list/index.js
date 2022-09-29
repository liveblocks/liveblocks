import React from "react";
import { AppRegistry, unstable_batchedUpdates } from "react-native";
import { LiveList } from "@liveblocks/client";
import { RoomProvider } from "./liveblocks.config";
import App from "./App";
import { name as appName } from "./app.json";

const roomId = "react-native-todo-list";

const initialStorage = () => ({
  todos: new LiveList([]),
});

const Wrapper = () => {
  return (
    <RoomProvider
      id={roomId}
      initialStorage={initialStorage}
      initialPresence={{ isTyping: false }}
      unstable_batchedUpdates={
        // NOTE: Only needed while this project is on React 17. After upgrading
        // to React 18, this can be removed.
        unstable_batchedUpdates
      }
    >
      <App />
    </RoomProvider>
  );
};

AppRegistry.registerComponent(appName, () => Wrapper);
