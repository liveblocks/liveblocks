"use client";

import type { ReactNode } from "react";
import { Window } from "@/components/window";
import {
  CARGO,
  CARGO_KINDS,
  INDUSTRY_MAX_LEVEL,
  INDUSTRY_PERIOD_MS,
  INDUSTRY_SHARE,
  MIN_HOUSES_FOR_PASSENGERS,
} from "@/game/constants";
import {
  industryCap,
  industryOutput,
  industryService,
  industryState,
  industryStock,
  servesIndustry,
  tradePartners,
} from "@/game/economy";
import type {
  Cargo,
  CompanyData,
  IndustryState,
  StationData,
} from "@/game/types";
import { type Industry, INDUSTRY, type World } from "@/game/world";
import { useNow } from "@/hooks/use-now";

function Row({
  onClick,
  children,
}: {
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <li>
      <button
        type="button"
        className="flex w-full items-center gap-2 px-1.5 py-0.5 text-left hover:bg-[#000080] hover:text-white"
        onClick={onClick}
      >
        {children}
      </button>
    </li>
  );
}

// Opens when an industry is clicked on the map: what it makes or takes, and
// which other industries that cargo travels to or from
export function IndustryWindow({
  world,
  industry,
  saved,
  startedAt,
  stations,
  companies,
  onShowIndustry,
  onClose,
}: {
  world: World;
  industry: Industry;
  // What Storage has on this industry, if a vehicle has been to it yet
  saved: IndustryState | undefined;
  // When the map started, on the game clock
  startedAt: number;
  stations: ReadonlyMap<string, StationData>;
  companies: ReadonlyMap<string, CompanyData>;
  onShowIndustry: (industry: Industry) => void;
  onClose: () => void;
}) {
  const { produces, accepts } = INDUSTRY[industry.type];
  const cargo = produces ?? accepts;
  // What the industry has waiting isn't stored as a number that ticks up:
  // it is worked out from the clock
  const now = useNow();
  const state = industryState(saved, startedAt);
  const waiting = industryStock(industry, state, now);
  const cap = industryCap(state.level);
  const perMinute = Math.round(industryOutput(industry, state.level) * 60);
  const service = Math.round(industryService(industry, state, now) * 100);
  const wanted = Math.round(INDUSTRY_SHARE * 100);
  const minutes = INDUSTRY_PERIOD_MS / 60_000;
  let outlook = `Carry away ${wanted}% of it for ${minutes} minutes and it makes twice as much.`;
  if (state.level >= INDUSTRY_MAX_LEVEL) {
    outlook = "It can't make more than this.";
  } else if (state.moved > 0) {
    outlook = `${service}% of it has been carried away lately. Keep that at ${wanted}% or more and it makes twice as much.`;
  }
  const partners = tradePartners(world, industry);
  const serving = [...stations].filter(([key]) =>
    servesIndustry(world, Number(key), industry)
  );

  return (
    <Window title={industry.name} className="w-64" onClose={onClose}>
      <div className="flex flex-col gap-1.5 px-1 pt-1.5 pb-1">
        {cargo ? (
          <p>
            <span className="font-bold">
              {produces ? "Produces" : "Accepts"}:
            </span>{" "}
            {CARGO[cargo].label}
            {produces ? ` · about ${perMinute} a minute` : null}
          </p>
        ) : null}

        {produces ? (
          <div>
            <div className="flex justify-between">
              <span className="font-bold">Waiting to be carried away</span>
              <span className="tabular-nums">
                {Math.floor(waiting).toLocaleString("en-US")}
              </span>
            </div>
            <div className="h-2 border border-[#808080] bg-white">
              <div
                className="h-full bg-[#000080]"
                style={{ width: `${Math.min(1, waiting / cap) * 100}%` }}
              />
            </div>
            <p className="mt-1">
              {state.level > 0
                ? `Makes ${2 ** state.level} times what it started with. `
                : null}
              {outlook}
            </p>
          </div>
        ) : null}
        {accepts ? (
          <p>
            <span className="font-bold">Delivered so far:</span>{" "}
            <span className="tabular-nums">
              {state.received.toLocaleString("en-US")}
            </span>
          </p>
        ) : null}

        <div>
          <h3 className="mb-0.5 font-bold">
            {produces ? "Take it to" : "Bring it from"}
          </h3>
          <ul className="win-inset flex flex-col py-0.5">
            {partners.length === 0 ? (
              <li className="px-1.5 py-0.5 text-[#808080]">
                Nowhere on this map
              </li>
            ) : null}
            {partners.map((partner) => (
              <Row
                key={partner.industry.id}
                onClick={() => onShowIndustry(partner.industry)}
              >
                <span className="min-w-0 flex-1 truncate">
                  {partner.industry.name}
                </span>
                <span className="shrink-0 tabular-nums opacity-75">
                  {partner.distance} tiles
                </span>
              </Row>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="mb-0.5 font-bold">Stations in reach</h3>
          <ul className="win-inset flex flex-col gap-0.5 px-1.5 py-1">
            {serving.length === 0 ? (
              <li className="text-[#808080]">
                None yet. Build one a few tiles from here.
              </li>
            ) : null}
            {serving.map(([key, station]) => (
              <li key={key} className="flex items-center gap-1.5">
                <span
                  className="size-2.5 shrink-0 border border-black"
                  style={{
                    background:
                      companies.get(station.owner)?.color ?? "#a3a3a3",
                  }}
                />
                <span className="truncate">{station.name}</span>
              </li>
            ))}
          </ul>
        </div>

        <p>
          {produces
            ? "A vehicle earns money when it runs from a station here to a station next to one of those. The further apart, the more each load pays."
            : "A vehicle earns money when it brings this from a station next to one of those to a station here."}
        </p>
      </div>
    </Window>
  );
}

// The whole economy of the map at a glance: every cargo, where it comes
// from, and where it has to go
export function CargoWindow({
  world,
  onShowIndustry,
  onShowTown,
  onClose,
}: {
  world: World;
  onShowIndustry: (industry: Industry) => void;
  onShowTown: (town: number) => void;
  onClose: () => void;
}) {
  const industries = (cargo: Cargo, role: "produces" | "accepts") =>
    world.industries.filter(
      (industry) => INDUSTRY[industry.type][role] === cargo
    );

  // Which cargo there is differs per kind of map
  const freight = CARGO_KINDS.filter(
    (cargo) =>
      industries(cargo, "produces").length > 0 ||
      industries(cargo, "accepts").length > 0
  );

  return (
    <Window title="Cargo" className="w-72" onClose={onClose}>
      <div className="win-inset mt-[3px] flex max-h-[50vh] flex-col gap-2 overflow-y-auto px-1 py-1.5">
        {freight.map((cargo) => (
          <section key={cargo}>
            <h3 className="flex items-center gap-1.5 px-1.5 font-bold">
              <span
                className="size-2.5 shrink-0 border border-black"
                style={{ background: CARGO[cargo].color }}
              />
              {CARGO[cargo].label}
            </h3>
            <ul>
              {industries(cargo, "produces").map((industry) => (
                <Row key={industry.id} onClick={() => onShowIndustry(industry)}>
                  <span className="w-8 shrink-0 opacity-75">From</span>
                  <span className="truncate">{industry.name}</span>
                </Row>
              ))}
              {industries(cargo, "accepts").map((industry) => (
                <Row key={industry.id} onClick={() => onShowIndustry(industry)}>
                  <span className="w-8 shrink-0 opacity-75">To</span>
                  <span className="truncate">{industry.name}</span>
                </Row>
              ))}
            </ul>
          </section>
        ))}

        <section>
          <h3 className="flex items-center gap-1.5 px-1.5 font-bold">
            <span
              className="size-2.5 shrink-0 border border-black"
              style={{ background: CARGO.passengers.color }}
            />
            {CARGO.passengers.label}
          </h3>
          <p className="px-1.5 pb-0.5 opacity-75">
            Between any two stations with {MIN_HOUSES_FOR_PASSENGERS} or more
            buildings in reach
          </p>
          <ul>
            {world.towns.map((town) => (
              <Row key={town.id} onClick={() => onShowTown(town.id)}>
                <span className="truncate">{town.name}</span>
              </Row>
            ))}
          </ul>
        </section>
      </div>
    </Window>
  );
}
