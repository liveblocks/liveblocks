import React from "react";
import {
  XAxis,
  YAxis,
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  Legend,
} from "recharts";
import { dataRevenue, dataUsers } from "./data";
import { RoomProvider, useMyPresence, useOthers } from "@liveblocks/react";
import styles from "./App.module.css";
import Header from "./Header";
import Card from "./Card";

function BarChartDemo() {
  const [myPresence, updateMyPresence] = useMyPresence();
  const others = useOthers();

  const handleLegendMouseEnter = (e, cardId) => {
    const { dataKey } = e;

    updateMyPresence({
      selectedDataset: {
        cardId: cardId,
        dataKey: dataKey,
      },
    });
  };

  const handleLegendMouseLeave = (e) => {
    updateMyPresence({
      selectedDataset: null,
    });
  };

  const isDatasetSelected = (cardId, dataKey) => {
    if (
      myPresence?.selectedDataset?.cardId === cardId &&
      myPresence?.selectedDataset?.dataKey === dataKey
    ) {
      return true;
    }

    for (const other of others.toArray()) {
      if (
        other.presence?.selectedDataset?.cardId === cardId &&
        other.presence?.selectedDataset?.dataKey === dataKey
      ) {
        return true;
      }
    }

    return false;
  };

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
                  strokeWidth={isDatasetSelected("revenue", "current") ? 4 : 2}
                />
                <Line
                  type="monotone"
                  dataKey="previous"
                  stroke="#2E75FF"
                  strokeWidth={isDatasetSelected("revenue", "previous") ? 4 : 2}
                />
                <Legend
                  verticalAlign="top"
                  onMouseEnter={(event) =>
                    handleLegendMouseEnter(event, "revenue")
                  }
                  onMouseLeave={handleLegendMouseLeave}
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
