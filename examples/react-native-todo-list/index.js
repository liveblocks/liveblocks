import React from "react";
import { AppRegistry } from "react-native";
import { LiveList } from "@liveblocks/client";
import { RoomProvider } from "./liveblocks.config";
import App from "./App";
import { name as appName } from "./app.json";
import { URL } from "react-native-url-polyfill";

window.addEventListener = () => {}; // workaround until a solution is found to handle reconnection in RN
window.postMessage = () => {}; // used for Liveblocks DevTools. Not supported by RN
global.URL = URL; // need polyfill in RN

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
    >
      <App />
    </RoomProvider>
  );
};

AppRegistry.registerComponent(appName, () => Wrapper);
