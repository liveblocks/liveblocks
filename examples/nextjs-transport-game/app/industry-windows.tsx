"use client";

import type { ReactNode } from "react";
import { Window } from "@/components/window";
import { CARGO, MIN_HOUSES_FOR_PASSENGERS } from "@/game/constants";
import { servesIndustry, tradePartners } from "@/game/economy";
import type { Cargo, CompanyData, StationData } from "@/game/types";
import { type Industry, INDUSTRY, type World } from "@/game/world";

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
  stations,
  companies,
  onShowIndustry,
  onClose,
}: {
  world: World;
  industry: Industry;
  stations: ReadonlyMap<string, StationData>;
  companies: ReadonlyMap<string, CompanyData>;
  onShowIndustry: (industry: Industry) => void;
  onClose: () => void;
}) {
  const { produces, accepts, rate } = INDUSTRY[industry.type];
  const cargo = produces ?? accepts;
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
            {produces && rate
              ? ` · about ${Math.round(rate * 60)} a minute`
              : null}
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
                    background: companies.get(station.owner)?.color ?? "#a3a3a3",
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

const FREIGHT: Cargo[] = ["coal", "wood", "grain", "oil"];

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

  return (
    <Window title="Cargo" className="w-72" onClose={onClose}>
      <div className="win-inset mt-[3px] flex max-h-[50vh] flex-col gap-2 overflow-y-auto px-1 py-1.5">
        {FREIGHT.map((cargo) => (
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
