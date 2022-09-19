import React from "react";
import {
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  FlatList,
  View,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import {
  useOthers,
  useUpdateMyPresence,
  useStorage,
  useMutation,
} from "./liveblocks.config";
import Header from "./src/components/Header";
import Todo from "./src/components/Todo";
import TextInputWithButton from "./src/components/TextInputWithButton";
import NoMoreTodos from "./src/components/NoMoreTodos";

const App = () => {
  const todos = useStorage((root) => root.todos);
  const userCount = useOthers((others) => others.length);
  const updateMyPresence = useUpdateMyPresence();
  const isSomeoneTyping = useOthers((others) =>
    others.some((user) => user.presence.isTyping)
  );

  const addTodo = useMutation(({ storage }, text) => {
    storage.get("todos").push({ text });
  }, []);

  const deleteTodo = useMutation(({ storage }, index) => {
    storage.get("todos").delete(index);
  }, []);

  if (todos === null) {
    return (
      <View style={styles.noTodos}>
        <Text>Loading...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.backgroundContainer}>
      <StatusBar barStyle="dark-content" />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.container}
      >
        <>
          <Header whoIsHereCount={userCount} />
          {todos.length > 0 ? (
            <FlatList
              data={todos}
              renderItem={({ item, index }) => (
                <Todo text={item.text} onDelete={() => deleteTodo(index)} />
              )}
              keyExtractor={(_, index) => index.toString()}
            />
          ) : (
            <NoMoreTodos></NoMoreTodos>
          )}
          <View style={styles.bottomContainer}>
            <TextInputWithButton
              isSomeoneTyping={isSomeoneTyping}
              updateTypingStatus={(isTyping: boolean) =>
                updateMyPresence({ isTyping: isTyping })
              }
              handleOnSubmitEditing={(todo: string) => addTodo(todo)}
            ></TextInputWithButton>
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
    backgroundColor: "white",
    flex: 1,
  },
  noTodos: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  bottomContainer: {
    justifyContent: "center",
    padding: 16,
    borderTopWidth: 1,
    borderColor: "#E9EDF2",
    shadowOffset: {
      height: -10,
      width: 0,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowColor: "#00000008",
  },
});

export default App;
