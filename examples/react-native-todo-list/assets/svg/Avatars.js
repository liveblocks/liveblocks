import React from "react";
import Svg, {
  Circle,
  Defs,
  RadialGradient,
  Stop,
  Text,
} from "react-native-svg";

export function MoreAvatars({ count }) {
  return (
    <Svg width={32} height={32} fill="none" xmlns="http://www.w3.org/2000/svg">
      <Circle
        cx={16}
        cy={16}
        r={14}
        fill="#E9EDF2"
        stroke="#fff"
        strokeWidth={3}
      ></Circle>
      <Text
        x="40%"
        y="60%"
        textAnchor={"middle"}
        stroke="#676F7A"
        fontSize={10}
      >
        +{count}
      </Text>
    </Svg>
  );
}

export default function Avatar({ startColor, endColor }) {
  return (
    <Svg width={32} height={32} fill="none" xmlns="http://www.w3.org/2000/svg">
      <Circle
        cx={16}
        cy={16}
        r={14}
        fill="url(#a)"
        stroke="#fff"
        strokeWidth={3}
      />
      <Defs>
        <RadialGradient
          id="a"
          cx={0}
          cy={0}
          r={1}
          gradientUnits="userSpaceOnUse"
          gradientTransform="rotate(45.37 4.932 -5.009) scale(42.6232 37.1068)"
        >
          <Stop stopColor={startColor} />
          <Stop offset={1} stopColor={endColor} />
        </RadialGradient>
      </Defs>
    </Svg>
  );
}
