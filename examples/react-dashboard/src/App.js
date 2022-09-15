import React from "react";
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
import {
  RoomProvider,
  useMyPresence,
  useOthersMapped,
} from "./liveblocks.config";
import styles from "./App.module.css";
import Header from "./components/Header";
import Card from "./components/Card";

let roomId = "react-dashboard";

overrideRoomId();

function Example() {
  const [myPresence, updateMyPresence] = useMyPresence();
  const others = useOthersMapped((user) => user.presence.selectedDataset);

  const handleLegendPointerEnter = (e, cardId) => {
    const { dataKey } = e;

    updateMyPresence({
      selectedDataset: {
        cardId: cardId,
        dataKey: dataKey,
      },
    });
  };

  const handleLegendPointerLeave = (e) => {
    updateMyPresence({
      selectedDataset: null,
    });
  };

  const isDatasetSelected = (cardId, dataKey) => {
    if (
      myPresence.selectedDataset?.cardId === cardId &&
      myPresence.selectedDataset?.dataKey === dataKey
    ) {
      return true;
    }

    for (const other of others) {
      if (other[1]?.cardId === cardId && other[1]?.dataKey === dataKey) {
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
                  onPointerEnter={(event) =>
                    handleLegendPointerEnter(event, "revenue")
                  }
                  onPointerLeave={handleLegendPointerLeave}
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
                  onPointerEnter={(event) =>
                    handleLegendPointerEnter(event, "users")
                  }
                  onPointerLeave={handleLegendPointerLeave}
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
                  onPointerEnter={(event) =>
                    handleLegendPointerEnter(event, "activation")
                  }
                  onPointerLeave={handleLegendPointerLeave}
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

export default function App() {
  return (
    <RoomProvider
      id={roomId}
      initialPresence={{
        selectedDataset: { cardId: null, dataKey: null },
        cursor: null,
        cardId: null,
      }}
    >
      <Example />
    </RoomProvider>
  );
}

/**
 * This function is used when deploying an example on liveblocks.io.
 * You can ignore it completely if you run the example locally.
 */
function overrideRoomId() {
  const query = new URLSearchParams(window?.location?.search);
  const roomIdSuffix = query.get("roomId");

  if (roomIdSuffix) {
    roomId = `${roomId}-${roomIdSuffix}`;
  }
}
