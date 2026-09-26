import type { Team } from "../types";
import { TEAM_ID } from "./constants";

const now = new Date();

export const team: Team = {
  _id: TEAM_ID,
  name: "Peterborough Warriors",
  createdAt: now,
  updatedAt: now,
};
