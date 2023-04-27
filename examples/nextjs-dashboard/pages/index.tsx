import React, { useMemo } from "react";
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
import { DataKey } from "recharts/types/util/types";
import {
  dataRevenue,
  dataUsers,
  dataPlatforms,
  dataActivation,
} from "../src/data";
import { useMyPresence, useOthersMapped } from "../src/liveblocks.config";
import styles from "./index.module.css";
import Header from "../src/components/Header";
import Card from "../src/components/Card";


export default function Example() {
  const [myPresence, updateMyPresence] = useMyPresence();
  const others = useOthersMapped((user) => user.presence.selectedDataset);

  const handleLegendPointerEnter = (
    e: {
      dataKey: DataKey<string>;
    },
    cardId: string
  ) => {
    const { dataKey } = e;

    const selectedDataset = {
      cardId: cardId,
      dataKey: dataKey.toString(), // convert number to string
    };

    updateMyPresence({
      selectedDataset: selectedDataset,
    });
  };

  const handleLegendPointerLeave = () => {
    updateMyPresence({
      selectedDataset: null,
    });
  };

  const isDatasetSelected = (cardId: string, dataKey: DataKey<string>) => {
    if (
      myPresence.selectedDataset?.cardId === cardId &&
      myPresence.selectedDataset?.dataKey === dataKey
    ) {
      return true;
    }

    for (const [, selectedDataset] of others) {
      if (
        selectedDataset?.cardId === cardId &&
        selectedDataset?.dataKey === dataKey
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

export async function getStaticProps() {
  const API_KEY = process.env.NEXT_PUBLIC_LIVEBLOCKS_PUBLIC_KEY;
  const API_KEY_WARNING = process.env.CODESANDBOX_SSE
    ? `Add your public key from https://liveblocks.io/dashboard/apikeys as the \`NEXT_PUBLIC_LIVEBLOCKS_PUBLIC_KEY\` secret in CodeSandbox.\n` +
      `Learn more: https://github.com/liveblocks/liveblocks/tree/main/examples/nextjs-live-cursors-chat#codesandbox.`
    : `Create an \`.env.local\` file and add your public key from https://liveblocks.io/dashboard/apikeys as the \`NEXT_PUBLIC_LIVEBLOCKS_PUBLIC_KEY\` environment variable.\n` +
      `Learn more: https://github.com/liveblocks/liveblocks/tree/main/examples/nextjs-live-cursors-chat#getting-started.`;

  if (!API_KEY) {
    console.warn(API_KEY_WARNING);
  }

  return { props: {} };
}

