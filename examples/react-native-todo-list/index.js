/**
 * @format
 */

import { AppRegistry } from 'react-native';
import React from 'react';
import App from './App';
import { name as appName } from './app.json';

import { createClient } from '@liveblocks/client';
import { LiveblocksProvider, RoomProvider } from '@liveblocks/react';

import { decode } from 'base-64';

const PUBLIC_KEY = "pk_YOUR_PUBLIC_KEY";
const roomId = "react-native-todo-app";

// TODO remove when @liveblocks/client@0.17 will be released
global.atob = decode;
window.addEventListener = () => { }

const client = createClient({
  publicApiKey: PUBLIC_KEY,
  // atobPolyfill: decode // TODO uncomment when @liveblocks/client@0.17 will be released
});

const Wrapper = () => {
  return (
    <LiveblocksProvider client={client}>
      <RoomProvider id={roomId}>
        <App />
      </RoomProvider>
    </LiveblocksProvider>
  );
};

AppRegistry.registerComponent(appName, () => Wrapper);
