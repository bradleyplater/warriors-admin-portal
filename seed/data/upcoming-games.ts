import { todayInLondon } from "../../lib/upcoming-games/time";
import type { UpcomingGame } from "../types";
import { OPPONENT_IDS } from "./opponents";

const now = new Date();

// Dates are relative to the day the seed runs, so there is always one past
// game (shown under Past, not published) and some genuinely upcoming ones.
// "Unplayed Opponents" is deliberately left out so it stays unreferenced.
function daysFromToday(days: number): string {
  const [year, month, day] = todayInLondon(now).split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
}

function upcomingGame(game: Omit<UpcomingGame, "createdAt" | "updatedAt">): UpcomingGame {
  return { ...game, createdAt: now, updatedAt: now };
}

export const upcomingGames: UpcomingGame[] = [
  upcomingGame({
    _id: "UPG100001",
    opponentId: OPPONENT_IDS.iceHawks,
    date: daysFromToday(-7),
    time: "19:00",
    location: "HOME",
    type: "LLIHC",
  }),
  // Rivals HC is the seeded opponent with a logo.
  upcomingGame({
    _id: "UPG100002",
    opponentId: OPPONENT_IDS.rivalsHc,
    date: daysFromToday(2),
    time: "20:30",
    location: "HOME",
    type: "CHALLENGE",
  }),
  upcomingGame({
    _id: "UPG100003",
    opponentId: OPPONENT_IDS.northernBlades,
    date: daysFromToday(9),
    time: "16:00",
    location: "AWAY",
    venue: "Northern Ice Arena",
    type: "BOTBC",
  }),
  upcomingGame({
    _id: "UPG100004",
    opponentId: OPPONENT_IDS.metroKings,
    date: daysFromToday(16),
    time: "18:15",
    location: "AWAY",
    venue: "Metro Leisure Centre",
    type: "LLIHC",
  }),
];
