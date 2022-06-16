/**
 * @format
 * @flow strict-local
 */

import React from 'react';
import {
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  FlatList,
  View,
  KeyboardAvoidingView,
} from 'react-native';

import { useOthers, useList, useUpdateMyPresence } from '@liveblocks/react';

import Header from './src/components/Header';
import Todo from './src/components/Todo';
import TextInputWithButton from './src/components/TextInputWithButton'
import NoMoreTodos from './src/components/NoMoreTodos';

const App = () => {
  const todos = useList('todos');
  const others = useOthers();
  const updateMyPresence = useUpdateMyPresence();
  const isSomeoneTyping = others
    .toArray()
    .some(user => user.presence?.isTyping);

  if (todos === null) {
    return <View style={styles.noTodos}><Text>Loading...</Text></View>;
  }

  return (
    <SafeAreaView style={styles.backgroundContainer}>
      <StatusBar barStyle='dark-content' />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.container}>
        <>
          <Header whoIsHereCount={others?.count} />
          {
            todos.toArray().length > 0 ?
              <FlatList
                data={todos.toArray()}
                renderItem={({ item, index }) => <Todo text={item.text} onDelete={() => todos.delete(index)} />}
                keyExtractor={(_, index) => index}
              />
              : <NoMoreTodos></NoMoreTodos>
          }
          <View style={styles.bottomContainer}>
            <TextInputWithButton
              isSomeoneTyping={isSomeoneTyping}
              updateTypingStatus={(isTyping) => updateMyPresence({ isTyping: isTyping })}
              handleOnSubmitEditing={(todo) => todos.push({ text: todo })}>
            </TextInputWithButton>
          </View>
        </>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backgroundContainer: {
    backgroundColor: 'white',
    flex: 1,
  },
  noTodos: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center'
  },
  bottomContainer: {
    justifyContent: 'center',
    padding: 16,
    borderTopWidth: 1,
    borderColor: '#E9EDF2',
    shadowOffset: {
      height: -10,
      width: 0
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowColor: '#00000008'
  }
});

export default App;
