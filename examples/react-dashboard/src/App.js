import React, { useEffect, useState } from "react";
import {
  XAxis,
  YAxis,
  ResponsiveContainer,
  LineChart,
  Line,
  Bar,
  Legend,
  PieChart,
  Pie,
  BarChart,
} from "recharts";
import { dataRevenue, dataUsers, dataPlatforms, dataActivation } from "./data";
import { RoomProvider, useMyPresence, useOthers } from "@liveblocks/react";
import styles from "./App.module.css";
import Header from "./components/Header";
import Card from "./components/Card";

function Example() {
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
                <XAxis dataKey="name" hide />
                <YAxis type="number" domain={["dataMin", "dataMax"]} hide />
                <Line
                  type="monotone"
                  dataKey="current"
                  stroke={
                    isDatasetSelected("revenue", "previous")
                      ? "#e1e5e9"
                      : "#31f2cc"
                  }
                  strokeWidth={2}
                />
                <Line
                  type="monotone"
                  dataKey="previous"
                  stroke={
                    isDatasetSelected("revenue", "current")
                      ? "#e1e5e9"
                      : "#2E75FF"
                  }
                  strokeWidth={2}
                />
                <Legend
                  align="left"
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
        <Card id="platforms">
          <h2 className={styles.card_heading}>
            Platforms
            <span>Most used: Android</span>
          </h2>

          <div className={styles.card_chart_area}>
            <ResponsiveContainer width={"100%"} height={220}>
              <PieChart>
                <Pie
                  data={dataPlatforms}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  innerRadius={60}
                  dataKey="value"
                  label={(entry) => {
                    return entry.name;
                  }}
                  labelLine={false}
                  fill={"#2E75FF"}
                />
              </PieChart>
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
                <XAxis dataKey="name" hide />
                <YAxis type="number" domain={["dataMin", "dataMax"]} hide />
                <Line
                  type="monotone"
                  dataKey="current"
                  stroke={
                    isDatasetSelected("users", "previous")
                      ? "#e1e5e9"
                      : "#31f2cc"
                  }
                  strokeWidth={2}
                />
                <Line
                  type="monotone"
                  dataKey="previous"
                  stroke={
                    isDatasetSelected("users", "current")
                      ? "#e1e5e9"
                      : "#2E75FF"
                  }
                  strokeWidth={2}
                />
                <Legend
                  align="left"
                  verticalAlign="top"
                  onMouseEnter={(event) =>
                    handleLegendMouseEnter(event, "users")
                  }
                  onMouseLeave={handleLegendMouseLeave}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card id="activation">
          <h2 className={styles.card_heading}>
            Activation
            <span>Users</span>
          </h2>

          <div className={styles.card_chart_area}>
            <ResponsiveContainer width={"100%"} height={220}>
              <BarChart
                data={dataActivation}
                margin={{ top: 8, right: 8, left: 8, bottom: 8 }}
              >
                <Legend
                  align="left"
                  verticalAlign="top"
                  onMouseEnter={(event) =>
                    handleLegendMouseEnter(event, "activation")
                  }
                  onMouseLeave={handleLegendMouseLeave}
                />
                <Bar
                  dataKey="current"
                  fill={
                    isDatasetSelected("activation", "previous")
                      ? "#e1e5e9"
                      : "#31f2cc"
                  }
                />
                <Bar
                  dataKey="previous"
                  fill={
                    isDatasetSelected("activation", "current")
                      ? "#e1e5e9"
                      : "#2E75FF"
                  }
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
    </div>
  );
}

const defaultRoomId = "react-dashboard";

export default function App() {
  const [roomId, setRoomId] = useState(defaultRoomId);

  /**
   * Add a suffix to the room ID using a query parameter.
   * Used for coordinating rooms from outside (e.g. https://liveblocks.io/examples).
   *
   * http://localhost:3000/?room=1234 → react-dashboard-1234
   */
  useEffect(() => {
    const roomSuffix = new URLSearchParams(window?.location?.search).get(
      "room"
    );

    if (roomSuffix) {
      setRoomId(`${defaultRoomId}-${roomSuffix}`);
    }
  }, []);

  return (
    <RoomProvider
      id={roomId}
      defaultPresence={() => ({ cardId: null, cursor: null })}
    >
      <Example />
    </RoomProvider>
  );
}
