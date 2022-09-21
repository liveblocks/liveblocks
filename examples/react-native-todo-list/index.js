import React from "react";
import { AppRegistry } from "react-native";
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
    <RoomProvider id={roomId} initialStorage={initialStorage} initialPresence={{ isTyping: false }}>
      <App />
    </RoomProvider>
  );
};

AppRegistry.registerComponent(appName, () => Wrapper);
