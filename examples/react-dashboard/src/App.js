import React, { useRef } from "react";
import {
  XAxis,
  YAxis,
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
} from "recharts";
import { dataRevenue, dataUsers } from "./data";
import { RoomProvider } from "@liveblocks/react";
import styles from "./App.module.css";
import Header from "./Header";
import Card from "./Card";

function BarChartDemo() {
  return (
    <div className={styles.container}>
      <Header />
      <div className={styles.container_charts}>
        <Card id="revenue">
          <h2 className={styles.card_heading}>
            $12,900
            <span>Revenue</span>
          </h2>

          <div className={styles.card_chart_area}>
            <ResponsiveContainer width={"100%"} height={220}>
              <LineChart
                data={dataRevenue}
                margin={{ top: 8, right: 8, left: 8, bottom: 8 }}
              >
                <CartesianGrid stroke="#e1e5e9" strokeDasharray="5 5" />
                <XAxis dataKey="name" hide />
                <YAxis type="number" domain={["dataMin", "dataMax"]} hide />
                <Line
                  type="monotone"
                  dataKey="current"
                  stroke="#31f2cc"
                  strokeWidth={2}
                />
                <Line
                  type="monotone"
                  dataKey="previous"
                  stroke="#2E75FF"
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card id="users">
          <h2 className={styles.card_heading}>
            455
            <span>New users</span>
          </h2>

          <div className={styles.card_chart_area}>
            <ResponsiveContainer width={"100%"} height={220}>
              <LineChart
                data={dataUsers}
                margin={{ top: 8, right: 8, left: 8, bottom: 8 }}
              >
                <CartesianGrid stroke="#e1e5e9" strokeDasharray="5 5" />
                <XAxis dataKey="name" hide />
                <YAxis type="number" domain={["dataMin", "dataMax"]} hide />
                <Line
                  type="monotone"
                  dataKey="current"
                  stroke="#31f2cc"
                  strokeWidth={2}
                />
                <Line
                  type="monotone"
                  dataKey="previous"
                  stroke="#2E75FF"
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <RoomProvider
      id={"example-chartjs"}
      defaultPresence={() => ({ cardId: null, cursor: null })}
    >
      <BarChartDemo />
    </RoomProvider>
  );
}
