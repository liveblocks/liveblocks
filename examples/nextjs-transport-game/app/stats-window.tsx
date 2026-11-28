"use client";

import { useState } from "react";
import { Window } from "@/components/window";
import { STATS_PERIOD_MS } from "@/game/constants";
import { formatMoney } from "@/game/economy";
import type { CompanyData, StatsSample } from "@/game/types";

// One line in a graph: a value for some of the periods, oldest first
type Series = {
  id: string;
  label: string;
  color: string;
  points: { at: number; value: number }[];
};

type Graph = {
  id: string;
  label: string;
  detail: string;
  format: (value: number) => string;
  // The same, but short enough to fit next to the graph
  axis: (value: number) => string;
  series: (
    samples: [number, StatsSample][],
    companies: ReadonlyMap<string, CompanyData>
  ) => Series[];
};

const count = (value: number) => Math.round(value).toLocaleString("en-US");

// Short numbers for along the side of a graph: 1.5K, 2M
const compact = new Intl.NumberFormat("en-US", {
  notation: "compact",
  maximumFractionDigits: 1,
});
const shortCount = (value: number) => compact.format(value);
const shortMoney = (value: number) =>
  `${value < 0 ? "-" : ""}$${compact.format(Math.abs(value))}`;

// A line per company, of whatever `pick` reads from each sample
function perCompany(
  samples: [number, StatsSample][],
  companies: ReadonlyMap<string, CompanyData>,
  pick: (entry: StatsSample["companies"][string]) => number
): Series[] {
  return [...companies].map(([id, company]) => ({
    id,
    label: company.name,
    color: company.color,
    points: samples.flatMap(([at, sample]) =>
      sample.companies[id] ? [{ at, value: pick(sample.companies[id]) }] : []
    ),
  }));
}

// Turns a number that only goes up into how fast it goes up, per minute
function perMinute(series: Series): Series {
  const points: Series["points"] = [];
  for (let index = 1; index < series.points.length; index++) {
    const before = series.points[index - 1];
    const after = series.points[index];
    const minutes = ((after.at - before.at) * STATS_PERIOD_MS) / 60_000;
    points.push({
      at: after.at,
      value: (after.value - before.value) / minutes,
    });
  }
  return { ...series, points };
}

// Not a company: drawn in the color the interface uses for what stands out
const WORLD = { id: "world", color: "var(--ui-accent)" };

const GRAPHS: Graph[] = [
  {
    id: "income",
    label: "Income",
    detail: "What each company's vehicles earn per minute, after running costs",
    format: formatMoney,
    axis: shortMoney,
    series: (samples, companies) =>
      perCompany(samples, companies, (entry) => entry.earned).map(perMinute),
  },
  {
    id: "money",
    label: "Money",
    detail: "What each company has in the bank",
    format: formatMoney,
    axis: shortMoney,
    series: (samples, companies) =>
      perCompany(samples, companies, (entry) => entry.balance),
  },
  {
    id: "vehicles",
    label: "Vehicles",
    detail: "How many vehicles each company runs",
    format: count,
    axis: shortCount,
    series: (samples, companies) =>
      perCompany(samples, companies, (entry) => entry.vehicles),
  },
  {
    id: "freight",
    label: "Freight",
    detail: "Units of freight delivered to industries per minute, by everyone",
    format: count,
    axis: shortCount,
    series: (samples) => [
      perMinute({
        ...WORLD,
        label: "Freight delivered",
        points: samples.map(([at, sample]) => ({ at, value: sample.freight })),
      }),
    ],
  },
  {
    id: "people",
    label: "People",
    detail: "How many people live in all the towns together",
    format: count,
    axis: shortCount,
    series: (samples) => [
      {
        ...WORLD,
        label: "Population",
        points: samples.map(([at, sample]) => ({
          at,
          value: sample.population,
        })),
      },
    ],
  },
];

const WIDTH = 300;
const HEIGHT = 130;
// Room for the numbers along the left side, and the times along the bottom
const LEFT = 46;
const BOTTOM = 14;
const TOP = 6;

// A round number at or above `value`, to end an axis on: 1, 2 or 5 followed
// by zeros
function roundUp(value: number) {
  const magnitude = 10 ** Math.floor(Math.log10(value));
  const step = [1, 2, 5, 10].find((each) => each * magnitude >= value) ?? 10;
  return step * magnitude;
}

function Chart({
  series,
  format,
}: {
  series: Series[];
  format: (value: number) => string;
}) {
  const points = series.flatMap((each) => each.points);
  const first = Math.min(...points.map((point) => point.at));
  const last = Math.max(...points.map((point) => point.at));
  const high = roundUp(Math.max(1, ...points.map((point) => point.value)));
  const lowest = Math.min(0, ...points.map((point) => point.value));
  const low = lowest < 0 ? -roundUp(-lowest) : 0;

  const x = (at: number) =>
    LEFT + ((at - first) / Math.max(1, last - first)) * (WIDTH - LEFT - 4);
  const y = (value: number) =>
    TOP + (1 - (value - low) / (high - low)) * (HEIGHT - TOP - BOTTOM);
  const minutes = Math.round(((last - first) * STATS_PERIOD_MS) / 60_000);
  const lines = low < 0 ? [high, 0, low] : [high, high / 2, 0];

  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      className="win-inset block w-full"
      role="img"
      aria-label="Graph"
    >
      {lines.map((value) => (
        <g key={value}>
          <line
            x1={LEFT}
            x2={WIDTH - 4}
            y1={y(value)}
            y2={y(value)}
            className={value === 0 ? "stroke-ui-line" : "stroke-ui-rule"}
            strokeWidth={1}
          />
          <text
            x={LEFT - 4}
            y={y(value) + 3}
            textAnchor="end"
            fontSize={9}
            className="fill-ui-muted"
          >
            {format(value)}
          </text>
        </g>
      ))}
      <text x={LEFT} y={HEIGHT - 3} fontSize={9} className="fill-ui-muted">
        {minutes < 1 ? "Just now" : `${minutes} min ago`}
      </text>
      <text
        x={WIDTH - 4}
        y={HEIGHT - 3}
        textAnchor="end"
        fontSize={9}
        className="fill-ui-muted"
      >
        Now
      </text>
      {series.map((each) =>
        each.points.length === 1 ? (
          <circle
            key={each.id}
            cx={x(each.points[0].at)}
            cy={y(each.points[0].value)}
            r={2}
            fill={each.color}
          />
        ) : (
          <polyline
            key={each.id}
            points={each.points
              .map(
                (point) =>
                  `${x(point.at).toFixed(1)},${y(point.value).toFixed(1)}`
              )
              .join(" ")}
            fill="none"
            stroke={each.color}
            strokeWidth={1.75}
            strokeLinejoin="round"
          />
        )
      )}
    </svg>
  );
}

// Graphs of how the game has been going. Nothing here is counted by this
// player's browser: it all comes from the samples that are kept in Storage,
// so everyone sees the same graphs, also of what happened before they
// joined.
export function StatsWindow({
  stats,
  companies,
  onClose,
}: {
  stats: ReadonlyMap<string, StatsSample>;
  companies: ReadonlyMap<string, CompanyData>;
  onClose: () => void;
}) {
  const [graphId, setGraphId] = useState(GRAPHS[0].id);
  const graph = GRAPHS.find((each) => each.id === graphId) ?? GRAPHS[0];

  const samples = [...stats]
    .map(([key, sample]): [number, StatsSample] => [Number(key), sample])
    .sort((a, b) => a[0] - b[0]);
  const series = graph
    .series(samples, companies)
    .filter((each) => each.points.length > 0);

  return (
    <Window title="Statistics" className="w-80" onClose={onClose}>
      <div className="flex flex-col gap-1.5 px-1 pt-1.5 pb-1">
        <div className="flex gap-px">
          {GRAPHS.map((each) => (
            <button
              key={each.id}
              type="button"
              className="win-button min-w-0 flex-1 px-1"
              aria-pressed={each.id === graph.id}
              onClick={() => setGraphId(each.id)}
            >
              {each.label}
            </button>
          ))}
        </div>

        {series.length === 0 ? (
          <p className="win-inset px-1.5 py-6 text-center text-ui-muted">
            Nothing to show yet. Graphs fill in as the game goes on.
          </p>
        ) : (
          <Chart series={series} format={graph.axis} />
        )}

        <ul className="flex flex-col gap-0.5">
          {series.map((each) => (
            <li key={each.id} className="flex items-center gap-1.5">
              <span
                className="size-2.5 shrink-0 border border-ui-edge"
                style={{ background: each.color }}
              />
              <span className="min-w-0 flex-1 truncate">{each.label}</span>
              <span className="tabular-nums">
                {graph.format(each.points[each.points.length - 1].value)}
              </span>
            </li>
          ))}
        </ul>
        <p className="text-ui-muted">{graph.detail}</p>
      </div>
    </Window>
  );
}
