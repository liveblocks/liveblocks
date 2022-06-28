import React, { useState } from "react";

import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Keyboard,
} from "react-native";

import { ActiveIcon, InactiveIcon } from "../../assets/svg/ConfirmIcon";

type TextInputWithButtonProps = {
  handleOnSubmitEditing: (text: string) => void;
  updateTypingStatus: (isUpdating: boolean) => void;
  isSomeoneTyping: boolean;
};

const SomeoneIsTyping = () => {
  return <Text style={styles.someoneIsTypingText}>Someone is typing...</Text>;
};

const TextInputWithButton = ({
  handleOnSubmitEditing,
  updateTypingStatus,
  isSomeoneTyping,
}: TextInputWithButtonProps) => {
  const [currentText, setCurrentText] = useState("");
  const [isInputFocused, setIsInputFocused] = useState(false);

  const validateText = () => {
    if (currentText) {
      handleOnSubmitEditing(currentText);
      setCurrentText("");
    }
  };

  return (
    <>
      <View style={styles.container}>
        <TextInput
          placeholderTextColor="#BCC2CC"
          placeholder="What needs to be done?"
          style={styles.textInput}
          value={currentText}
          onFocus={() => setIsInputFocused(true)}
          onChangeText={(e) => {
            setCurrentText(e);
            updateTypingStatus(true);
          }}
          onSubmitEditing={() => {
            if (currentText.length > 0) {
              validateText();
            }
          }}
          onKeyPress={(e) => {
            if (e.nativeEvent.key === "Enter") {
              updateTypingStatus(false);
              setCurrentText("");
            }
          }}
          onBlur={() => {
            updateTypingStatus(false);
            setIsInputFocused(false);
          }}
        />
        <TouchableOpacity
          onPress={() => {
            validateText();
            Keyboard.dismiss();
          }}
        >
          {isInputFocused ? <ActiveIcon /> : <InactiveIcon />}
        </TouchableOpacity>
      </View>
      {isSomeoneTyping && isInputFocused ? <SomeoneIsTyping /> : <></>}
    </>
  );
};

const styles = StyleSheet.create({
  textInput: {
    color: "#1F242B",
    fontWeight: "400",
    fontSize: 16,
    flex: 1,
  },
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderColor: "#E9EDF2",
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: "2%",
    paddingVertical: "1%",
    backgroundColor: "white",
  },
  someoneIsTypingText: {
    color: "#676F7A",
    fontWeight: "400",
    fontSize: 14,
    marginTop: 8,
  },
});

export default TextInputWithButton;
