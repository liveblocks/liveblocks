
import React from 'react';
import {
  StyleSheet,
  View,
  Text
} from 'react-native';

import Avatar from '../../assets/svg/Avatars';

const colorPairs = [{
  startColor: '#002A95', endColor: '#00A0D2'
}, {
  startColor: '#6116FF', endColor: '#E32DD1'
},
{
  startColor: '#39C7D1', endColor: '#62CC52'
}
];

const Avatars = ({ count }) => {
  const avatars = [];

  for (let i = 0; i < count; i++) {
    const colorPair = colorPairs[i % colorPairs.length];
    avatars.push(
      <View style={{ marginLeft: i === 0 ? 0 : -11 }}>
        <Avatar startColor={colorPair.startColor} endColor={colorPair.endColor} />
      </View>
    );
  }

  return <>
    {avatars}
  </>
}

const WhoIsHere = ({ count }) => {
  return (
    <View style={styles.container}>
      {count === 0 ? <></> : <Text style={styles.countText}>{count}</Text>}
      <Avatars count={count} />
    </View>);
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 32,
  },
  countText: {
    fontWeight: '700',
    fontSize: 16,
    marginRight: 8,
    color: '#1F242B'
  },
});

export default WhoIsHere;