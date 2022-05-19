/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 * @flow strict-local
 */

import React, {useRef} from 'react';
import {useState} from 'react';
import {
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  useColorScheme,
  View,
  TouchableOpacity,
  TouchableHighlight,
  PanResponder,
  Animated,
  Button,
} from 'react-native';

import {useOthers, useUpdateMyPresence, useMyPresence} from '@liveblocks/react';
import {useMap} from '@liveblocks/react';

const Rectangle = ({shape, id, onShapePointerDown, selectionColor}) => {
  console.log(id);

  const pan = useRef(new Animated.ValueXY()).current;

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        pan.setOffset({
          x: pan.x._value,
          y: pan.y._value,
        });
      },
      onPanResponderMove: Animated.event([null, {dx: pan.x, dy: pan.y}]),
      onPanResponderRelease: () => {
        pan.flattenOffset();
      },
      onPanResponderStart: () => {
        onShapePointerDown(id);
      },
    }),
  ).current;

  return (
    <Animated.View
      style={{
        transform: [{translateX: pan.x}, {translateY: pan.y}],
        backgroundColor: 'red',
        ...styles.box,
      }}
      {...panResponder.panHandlers}>
      <TouchableHighlight
        onPress={() => onShapePointerDown(id)}
        style={styles.box}>
        <View
          style={[
            styles.box,
            {borderColor: selectionColor || 'transparent'},
            {backgroundColor: shape.fill},
          ]}></View>
      </TouchableHighlight>
    </Animated.View>
  );
};

const COLORS = ['#DC2626', '#D97706', '#059669', '#7C3AED', '#DB2777'];

function getRandomInt(max) {
  return Math.floor(Math.random() * max);
}

function getRandomColor() {
  return COLORS[getRandomInt(COLORS.length)];
}

const App = () => {
  const [{selectedShape}, setPresence] = useMyPresence();
  const others = useOthers();
  const shapes = useMap('shapes');

  if (shapes == null) {
    return <Text>Loading</Text>;
  }

  console.log(shapes);

  const insertRectangle = () => {
    const shapeId = Date.now();
    const rectangle = {
      x: getRandomInt(300),
      y: getRandomInt(300),
      fill: getRandomColor(),
    };
    shapes.set(shapeId, rectangle);
  };

  const deleteRectangle = () => {
    shapes.delete(selectedShape);
    setPresence({selectedShape: null});
  };

  const onShapePointerDown = shapeId => {
    setPresence({selectedShape: shapeId});
  };

  return (
    <SafeAreaView style={styles.backgroundContainer}>
      <View
        style={{
          flex: 1,
        }}>
        <View style={{backgroundColor: 'white'}}>
          <Button title="Add" onPress={insertRectangle}></Button>
          <Button title="Delete" onPress={deleteRectangle}></Button>
        </View>
        {Array.from(shapes, ([shapeId, shape]) => {
          let selectionColor =
            selectedShape === shapeId
              ? 'blue'
              : others
                  .toArray()
                  .some(user => user.presence?.selectedShape === shapeId)
              ? 'green'
              : undefined;

          return (
            <Rectangle
              key={shapeId}
              shape={shape}
              id={shapeId}
              onShapePointerDown={onShapePointerDown}
              selectionColor={selectionColor}
            />
          );
        })}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  backgroundContainer: {
    backgroundColor: 'rgb(143, 243, 243)',
    flex: 1,
    padding: '15%',
  },
  box: {
    height: 150,
    width: 150,
    backgroundColor: 'blue',
    borderRadius: 5,
    borderWidth: 5,
  },
});

export default App;
