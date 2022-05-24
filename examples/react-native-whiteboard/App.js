/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 * @flow strict-local
 */

import React, {useLayoutEffect, useRef} from 'react';
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
  onGestureStart,
  onGestureStop,
}) => {
  console.log(shape);

  const pan = useRef(new Animated.ValueXY({x: shape.x, y: shape.y})).current;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        pan.setOffset({
          x: pan.x._value,
          y: pan.y._value,
        });
      },
      onPanResponderMove: (e, gestureState) => {
        const rectangleX = gestureState.x0 - e.nativeEvent.locationX;
        const rectangleY = gestureState.y0 - e.nativeEvent.locationY;

        // console.log(
        //   'render moving rectangle at ',
        //   'x:',
        //   rectangleX,
        //   ' - y:',
        //   rectangleY,
        // );

        // Animated.event([null, {dx: pan.x, dy: pan.y}])(e, gestureState);
        pan.x.setValue(gestureState.dx);
        pan.y.setValue(gestureState.dy);
        //  onShapePointerDown(id);
        onGestureStart(id, rectangleX, rectangleY);
      },
      onPanResponderRelease: () => {
        pan.flattenOffset();
      },

      onPanResponderEnd: () => {
        onGestureStop();
      },
    }),
  ).current;

  return (
    <>
      <Animated.View
        style={[
          {
            transform: [{translateX: pan.x}, {translateY: pan.y}],
          },
        ]}
        {...panResponder.panHandlers}>
        <View
          style={[
            styles.box,
            {borderColor: selectionColor || 'transparent'},
            {backgroundColor: shape.fill},
          ]}></View>
      </Animated.View>
    </>
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
  // const [isDragging, setIsDragging] = useState(false);

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

  const onGestureStop = () => {
    // alert(moving);
  };

  const onGestureStart = (id, x, y) => {
    const shape = shapes.get(id);
    if (shape) {
      shapes.set(id, {
        ...shape,
        x: x,
        y: y,
      });
    }
  };

  return (
    <SafeAreaView style={styles.backgroundContainer}>
      <View
        style={{
          flex: 1,
        }}>
        <View
          style={{
            flex: 1,
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

            // console.log(
            //   'ask rendering rectangle at ',
            //   'x:',
            //   shape.x,
            //   ' - y:',
            //   shape.y,
            // );

            return (
              <Rectangle
                key={shapeId}
                shape={shape}
                id={shapeId}
                onShapePointerDown={onShapePointerDown}
                selectionColor={selectionColor}
                onGestureStop={onGestureStop}
                onGestureStart={onGestureStart}
              />
            );
          })}
        </View>
        <View style={({backgroundColor: 'white'}, {position: 'absolute'})}>
          <Button title="Add" onPress={insertRectangle}></Button>
          <Button title="Delete" onPress={deleteRectangle}></Button>
        </View>
      </View>
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
