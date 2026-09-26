import type { Opponent } from "../types";

const now = new Date();

// Fixed ids so games.ts can reference them. One opponent carries a logo
// (its key points at no real object locally — the portal's logo route
// 404s, which is fine for seed data), and "Unplayed Opponents" is referenced
// by no game so deleting an unreferenced opponent can be exercised.
export const OPPONENT_IDS = {
  rivalsHc: "OPN100001",
  iceHawks: "OPN100002",
  northernBlades: "OPN100003",
  metroKings: "OPN100004",
  borderReivers: "OPN100005",
  coastalStorm: "OPN100006",
  historicCupRivals: "OPN100007",
  valleyVipers: "OPN100008",
  summitSabres: "OPN100009",
  eastsideEagles: "OPN100010",
  unplayed: "OPN100011",
} as const;

function opponent(
  _id: string,
  name: string,
  logo?: Opponent["logo"],
): Opponent {
  return { _id, name, ...(logo && { logo }), createdAt: now, updatedAt: now };
}

export const opponents: Opponent[] = [
  opponent(OPPONENT_IDS.rivalsHc, "Rivals HC", {
    key: `opponents/${OPPONENT_IDS.rivalsHc}/logo-1759000000000.svg`,
    contentType: "image/svg+xml",
  }),
  opponent(OPPONENT_IDS.iceHawks, "Ice Hawks"),
  opponent(OPPONENT_IDS.northernBlades, "Northern Blades"),
  opponent(OPPONENT_IDS.metroKings, "Metro Kings"),
  opponent(OPPONENT_IDS.borderReivers, "Border Reivers"),
  opponent(OPPONENT_IDS.coastalStorm, "Coastal Storm"),
  opponent(OPPONENT_IDS.historicCupRivals, "Historic Cup Rivals"),
  opponent(OPPONENT_IDS.valleyVipers, "Valley Vipers"),
  opponent(OPPONENT_IDS.summitSabres, "Summit Sabres"),
  opponent(OPPONENT_IDS.eastsideEagles, "Eastside Eagles"),
  opponent(OPPONENT_IDS.unplayed, "Unplayed Opponents"),
];
