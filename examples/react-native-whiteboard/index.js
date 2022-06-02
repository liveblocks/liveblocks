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
import NetInfo from '@react-native-community/netinfo';

if (!global.atob) {
  global.atob = decode;
}

window.addEventListener = () => {};

const client = createClient({
  publicApiKey: 'pk_test_lOMrmwejSWLaPYQc5_JuGH-H',
});

const unsubscribe = NetInfo.addEventListener(state => {
  if (state.type != 'none' && state.type != 'unknown') {
    if (state.isConnected) {
      const room = client.getRoom('react-native-whiteboard');
    }
  }

  console.log('Connection type', state.type);
  console.log('Is connected?', state.isConnected);
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
