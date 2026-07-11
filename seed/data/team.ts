import type { Team } from "../types";
import { TEAM_ID } from "./constants";
import { players } from "./players";

const now = new Date();

// Legacy players[] mirror — a straight copy of id + number, as it existed
// before the target shape removed this array in favour of Player.teamId.
const legacyPlayers = players.map((player) => ({
  playerId: player._id,
  number: player.number,
}));

// Legacy stats[] aggregate — deliberately drifted from what the stats
// engine would compute from seed/data/games.ts, so the reconciliation
// report (KAN-37) has real drift to detect. Actual computed totals from
// the seeded games: SSN2223 {goals:3,assists:3,pims:4},
// SSN2324 {goals:2,assists:1,pims:6}, SSN2425 {goals:5,assists:3,pims:4},
// SSN2526 {goals:5,assists:5,pims:8}.
const legacyStats = [
  { seasonId: "SSN2223", goals: 4, assists: 3, pims: 4 },
  { seasonId: "SSN2324", goals: 2, assists: 2, pims: 6 },
  { seasonId: "SSN2425", goals: 5, assists: 3, pims: 6 },
  { seasonId: "SSN2526", goals: 6, assists: 5, pims: 8 },
];

export const team: Team = {
  _id: TEAM_ID,
  name: "Peterborough Warriors",
  createdAt: now,
  updatedAt: now,
  players: legacyPlayers,
  stats: legacyStats,
};
