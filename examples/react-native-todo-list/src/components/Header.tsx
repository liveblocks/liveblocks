import React from "react";
import { StyleSheet, View } from "react-native";

import WhoIsHere from "./WhoIsHere";
import Today from "../../assets/svg/Today";

type HeaderProps = {
  whoIsHereCount: number;
};

const Header = ({ whoIsHereCount }: HeaderProps) => {
  return (
    <View style={styles.container}>
      <Today />
      <WhoIsHere count={whoIsHereCount}></WhoIsHere>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    height: "13%",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: "5%",
    paddingTop: 24,
    paddingBottom: 24,
  },
});

export default Header;
