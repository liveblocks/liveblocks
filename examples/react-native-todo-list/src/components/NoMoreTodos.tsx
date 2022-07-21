import React from "react";
import { View, Text, StyleSheet } from "react-native";

const NoMoreTodos = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>You're done 🙌</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  text: {
    color: "#4E5561",
    fontSize: 16,
  },
});

export default NoMoreTodos;
