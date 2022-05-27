/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 * @flow strict-local
 */

import React, {useCallback, useEffect, useLayoutEffect, useRef} from 'react';
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
  Dimensions,
} from 'react-native';

import {useOthers, useUpdateMyPresence, useMyPresence} from '@liveblocks/react';
import {useMap} from '@liveblocks/react';

const Rectangle = ({
  shape,
  id,
  onShapePointerDown,
  selectionColor,
  onGestureMove,
  onGestureStop,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const pan = useRef(new Animated.ValueXY()).current;

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        pan.setOffset({
          x: pan.x._value,
          y: pan.y._value,
        });
        onShapePointerDown(id);
      },
      onPanResponderMove: (e, gestureState) => {
        setIsDragging(true);

        const rectangleX = gestureState.moveX - e.nativeEvent.locationX;
        const rectangleY = gestureState.moveY - e.nativeEvent.locationY;

        pan.x.setValue(gestureState.dx);
        pan.y.setValue(gestureState.dy);
        onGestureMove(id, rectangleX, rectangleY);
      },
      onPanResponderRelease: () => {
        pan.flattenOffset();
      },

      onPanResponderEnd: () => {
        setIsDragging(false);
        onGestureStop();
      },
    }),
  ).current;

  if (!isDragging) {
    pan.x.setValue(shape.x);
    pan.y.setValue(shape.y);
  }

  return (
    <Animated.View
      style={[
        {
          ...styles.box,
          position: 'absolute',
          borderColor: selectionColor || 'transparent',
          backgroundColor: shape.fill,
          transform: [{translateX: pan.x}, {translateY: pan.y}],
        },
      ]}
      {...panResponder.panHandlers}></Animated.View>
  );
};

const COLORS = ['#DC2626', '#D97706', '#059669', '#7C3AED', '#DB2777'];

function getRandomInt(max) {
  return Math.floor(Math.random() * max);
}

function getRandomColor() {
  return COLORS[getRandomInt(COLORS.length)];
}

function getRandomArbitrary(min, max) {
  return Math.random() * (max - min) + min;
}

const App = () => {
  const [{selectedShape}, setPresence] = useMyPresence();
  const others = useOthers();
  const shapes = useMap('shapes');

  if (shapes == null) {
    return <Text>Loading</Text>;
  }

  const insertRectangle = () => {
    const shapeId = Date.now();
    const rectangle = {
      x: getRandomArbitrary(0, 50),
      y: getRandomArbitrary(30, 200),
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

  const onGestureStop = () => {};

  const onGestureMove = (id, x, y) => {
    const shape = shapes.get(id);
    if (shape) {
      shapes.set(id, {
        ...shape,
        x: x,
        y: y,
      });
    }
  };

  const moveRight = id => {
    const shape = localShapes[0];
    if (shape) {
      shape.x += 10;
      setLocalShapes([shape]);
    }
  };

  const moveLeft = id => {
    const shape = localShapes[0];
    if (shape) {
      shape.x -= 10;
    }
  };

  return (
    <SafeAreaView style={styles.backgroundContainer}>
      <>
        <View
          style={{
            flex: 1,
            position: 'absolute',
          }}>
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
                onGestureStop={onGestureStop}
                onGestureMove={onGestureMove}
              />
            );
          })}
        </View>
        <View style={({backgroundColor: 'white'}, {position: 'absolute'})}>
          <Button title="Add" onPress={insertRectangle}></Button>
          <Button title="Delete" onPress={deleteRectangle}></Button>
        </View>
      </>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  backgroundContainer: {
    backgroundColor: 'rgb(143, 243, 243)',
    flex: 1,
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
