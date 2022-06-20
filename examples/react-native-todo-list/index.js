/**
 * @format
 */

import React from 'react';
import { AppRegistry } from 'react-native';
import { RoomProvider } from './liveblocks.config';
import App from './App';
import { name as appName } from './app.json';

const roomId = "react-native-todo-app";

const Wrapper = () => {
  return (
    <RoomProvider id={roomId}>
      <App />
    </RoomProvider>
  );
};

AppRegistry.registerComponent(appName, () => Wrapper);
