/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 * @flow strict-local
 */

import React from 'react';
import {useState} from 'react';
import {
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  useColorScheme,
  View,
  TextInput,
  TouchableOpacity,
} from 'react-native';

import {useOthers, useUpdateMyPresence, useList} from '@liveblocks/react';

function WhoIsHere() {
  const others = useOthers();
  return <Text>There are {others.count} other users online</Text>;
}

function SomeoneIsTyping() {
  const someoneIsTyping = useOthers()
    .toArray()
    .some(user => user.presence?.isTyping);

  return (
    <Text style={{fontStyle: 'italic'}}>
      {someoneIsTyping ? 'Someone is typing...' : ''}
    </Text>
  );
}

const App = () => {
  const todos = useList('todos');
  const [currentText, setCurrentText] = useState('');
  const updateMyPresence = useUpdateMyPresence();
  const handleOnSubmitEditing = () => {
    todos?.push(currentText);
    setCurrentText('');
  };

  if (todos == null) {
    return <Text>Loading...</Text>;
  }

  return (
    <SafeAreaView style={styles.backgroundContainer}>
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        style={styles.backgroundContainer}>
        <View
          style={{
            flex: 1,
          }}>
          <WhoIsHere></WhoIsHere>
          <TextInput
            style={styles.textInput}
            value={currentText}
            onChangeText={e => {
              setCurrentText(e);
              updateMyPresence({isTyping: true});
            }}
            onSubmitEditing={handleOnSubmitEditing}
            onKeyPress={e => {
              if (e.key === 'Enter') {
                updateMyPresence({isTyping: false});
                setCurrentText('');
              }
            }}
            onBlur={() => updateMyPresence({isTyping: false})}
          />
          <SomeoneIsTyping></SomeoneIsTyping>

          {todos.map((todo, index) => {
            return (
              <View
                key={index}
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  height: 40,
                }}>
                <Text style={styles.todoText}>{todo}</Text>
                <TouchableOpacity onPress={() => todos.delete(index)}>
                  <Text style={styles.deleteButton}>X</Text>
                </TouchableOpacity>
              </View>
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  backgroundContainer: {
    backgroundColor: 'rgb(243, 243, 243)',
    flex: 1,
    padding: '15%',
  },
  textInput: {
    height: 50,
    width: '100%',
    borderColor: 'lightgrey',
    borderWidth: 2,
    borderRadius: 8,
    padding: 5,
    color: 'black',
    marginVertical: '5%',
    backgroundColor: 'white',
  },
  todoText: {
    fontSize: 16,
    fontWeight: '500',
  },
  input: {
    height: 40,
    margin: 12,
    borderWidth: 1,
    padding: 10,
  },
  deleteButton: {
    fontSize: 16,
    fontWeight: '500',
  },
});

export default App;
