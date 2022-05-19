/**
 * @format
 */

import {AppRegistry} from 'react-native';
import React from 'react';

import App from './App';
import {name as appName} from './app.json';

import {createClient} from '@liveblocks/client';
import {LiveblocksProvider, RoomProvider} from '@liveblocks/react';

import {decode, encode} from 'base-64';

if (!global.btoa) {
  global.btoa = encode;
}

if (!global.atob) {
  global.atob = decode;
}

window.addEventListener = () => {};

const client = createClient({
  publicApiKey: 'pk_test_lOMrmwejSWLaPYQc5_JuGH-H',
});

const Wrapper = () => {
  return (
    <LiveblocksProvider client={client}>
      <RoomProvider id="react-native-whiteboard">
        <App />
      </RoomProvider>
    </LiveblocksProvider>
  );
};

AppRegistry.registerComponent(appName, () => Wrapper);
