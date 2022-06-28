import React from "react";
import { StyleSheet, View, Text } from "react-native";

import Avatar, { MoreAvatars } from "../../assets/svg/Avatars";

const colorPairs = [
  {
    startColor: "#002A95",
    endColor: "#00A0D2",
    id: 1,
  },
  {
    startColor: "#6116FF",
    endColor: "#E32DD1",
    id: 2,
  },
  {
    startColor: "#39C7D1",
    endColor: "#62CC52",
    id: 3,
  },
];

type AvatarsTypeProps = {
  count: number;
};

type WhoIsHereProps = {
  count: number;
};

const Avatars = ({ count }: AvatarsTypeProps) => {
  const avatars = [];

  for (let i = 0; i < Math.min(3, count); i++) {
    const colorPair = colorPairs[i % colorPairs.length];
    avatars.push(
      <View style={{ marginLeft: i === 0 ? 0 : -11 }} key={colorPair.id}>
        <Avatar
          startColor={colorPair.startColor}
          endColor={colorPair.endColor}
        />
      </View>
    );
  }

  return <>{avatars}</>;
};

const WhoIsHere = ({ count }: WhoIsHereProps) => {
  const hasMoreUsers = count > 3;

  return (
    <View style={styles.container}>
      {count === 0 ? null : <Text style={styles.countText}>{count}</Text>}
      <Avatars count={count} />
      {hasMoreUsers ? (
        <View style={{ marginLeft: -11 }}>
          <MoreAvatars count={count - 3} />
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    height: 32,
  },
  countText: {
    fontWeight: "700",
    fontSize: 16,
    marginRight: 8,
    color: "#1F242B",
  },
});

export default WhoIsHere;
