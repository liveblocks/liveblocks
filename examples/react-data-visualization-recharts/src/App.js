import React, { useRef } from "react";
import {
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  ResponsiveContainer,
} from "recharts";

import { dataBar, dataPie } from "./data";

import {
  RoomProvider,
  useSelf,
  useMyPresence,
  useOthers,
} from "@liveblocks/react";

import Cursor from "./Cursor";

import "./App.css";

// Use to assign color to each user
const COLORS = [
  "#E57373",
  "#9575CD",
  "#4FC3F7",
  "#81C784",
  "#FFF176",
  "#FF8A65",
  "#F06292",
  "#7986CB",
];

function Avatar({ color, name }) {
  return (
    <div className="user">
      <span className="avatar" style={{ backgroundColor: color }}></span>
      <span>{name}</span>
    </div>
  );
}

function transformMyPosition(chartRef, x, y) {
  return {
    x: x / chartRef.current.container.clientWidth,
    y: y / chartRef.current.container.clientHeight,
  };
}

function transformOtherPosition(chartRef, x, y) {
  return {
    x:
      x * chartRef.current.container.clientWidth +
      chartRef.current.container.offsetLeft,
    y:
      y * chartRef.current.container.clientHeight +
      chartRef.current.container.offsetTop,
  };
}

function BarChartDemo() {
  const barChartRef = useRef();
  const pieChartRef = useRef();

  const currentUser = useSelf();
  const [myPresence, updateMyPresence] = useMyPresence();
  const others = useOthers();

  const getDataSelection = (chartId, index) => {
    if (
      currentUser &&
      myPresence &&
      myPresence.chartId === chartId &&
      myPresence.dataIndex === index
    ) {
      return COLORS[currentUser.connectionId % COLORS.length];
    }
    for (const other of others.toArray()) {
      if (
        other.presence &&
        other.presence.chartId === chartId &&
        other.presence.dataIndex === index
      ) {
        return COLORS[other.connectionId % COLORS.length];
      }
    }

    return "#b3afaf";
  };

  return (
    <div className="container">
      <div className="header">
        <h1 className="title">Data visualization with Liveblocks</h1>
        <div className="current-users">
          Current users:
          {currentUser ? (
            <Avatar
              name={"you"}
              color={COLORS[currentUser.connectionId % COLORS.length]}
            />
          ) : " Liveblocks public key not set."}
          {useOthers()
            .toArray()
            .map(({ connectionId }) => {
              return (
                <Avatar
                  name={`user#${connectionId}`}
                  color={COLORS[connectionId % COLORS.length]}
                />
              );
            })}
        </div>
      </div>
      <div className="charts-container">
        <ResponsiveContainer width="70%" height="100%">
          <BarChart
            ref={barChartRef}
            data={dataBar}
            margin={{
              top: 5,
              right: 30,
              left: 20,
              bottom: 5,
            }}
            onMouseMove={(state) => {
              if (state.chartX && state.chartY) {
                updateMyPresence({
                  chartId: "barChart",
                  dataIndex: state.activeTooltipIndex,
                  cursor: transformMyPosition(
                    barChartRef,
                    state.chartX,
                    state.chartY
                  ),
                });
              }
            }}
            onMouseLeave={() => {
              updateMyPresence({
                dataIndex: null,
                chart: null,
                cursor: null,
              });
            }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip cursor={false} />
            <Legend />
            <Bar dataKey="pv" fill="#b3afaf">
              {dataBar.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={getDataSelection("barChart", index)}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        <ResponsiveContainer width="30%" height="100%">
          <PieChart ref={pieChartRef}>
            <Pie
              data={dataPie}
              cx="50%"
              cy="50%"
              outerRadius={80}
              fill="#b3afaf"
              dataKey="value"
              onMouseEnter={(_, index) => {
                updateMyPresence({
                  chartId: "pieChart",
                  dataIndex: index,
                });
              }}
              onMouseLeave={() => {
                updateMyPresence({
                  dataIndex: null,
                  chart: null,
                  cursor: null,
                });
              }}
              label={true}
              isAnimationActive={false}
            >
              {dataPie.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={getDataSelection("pieChart", index)}
                />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
      </div>
      {
        others.map(({ connectionId, presence }) => {
          if (
            presence == null ||
            presence.cursor == null ||
            presence.chartId == null
          ) {
            return null;
          }

          const otherChartPosition = transformOtherPosition(
            presence.chartId === "barChart" ? barChartRef : pieChartRef,
            presence.cursor.x,
            presence.cursor.y
          );

          return (
            <Cursor
              key={`cursor-${connectionId}`}
              color={COLORS[connectionId % COLORS.length]}
              x={otherChartPosition.x}
              y={otherChartPosition.y}
            />
          );
        })
      }
    </div>
  );
}

export default function App() {
  return (
    <RoomProvider
      id={"example-chartjs"}
      defaultPresence={() => ({ cursor: null })}
    >
      <BarChartDemo />
    </RoomProvider>
  );
}
