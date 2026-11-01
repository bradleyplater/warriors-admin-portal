import type { z } from "zod";
import {
  AWARD_CATEGORIES,
  type AwardEntry,
  type AwardEvening,
  type Game,
  type Player,
  type Season,
} from "../../schemas";
import { awardCompetitionLabel, awardName } from "../../awards/display";
import { awardStat, statAwardTotal } from "../../awards/stat-leaders";
import type { AwardsArtifactSchema } from "../schemas";

export type AwardsArtifact = z.infer<typeof AwardsArtifactSchema>;
type AwardArtifact = AwardsArtifact["evenings"][number]["awards"][number];

// Where one-off awards sit, after the recurring groups.
const CLUB_AWARDS_GROUP = "Club awards";

function playerName(players: Map<string, Player>, id: string): string {
  const player = players.get(id);
  return player ? `${player.firstName} ${player.surname}` : id;
}

function awardArtifact(
  entry: AwardEntry,
  announced: boolean,
  context: {
    games: Game[];
    players: Map<string, Player>;
    seasonId: string;
    seasonName: string;
  },
): AwardArtifact {
  const name = awardName(entry);
  const stat = awardStat(entry);
  const competition = entry.competition
    ? awardCompetitionLabel(entry.competition)
    : undefined;

  const artifact: AwardArtifact = {
    ...(entry.category && { category: entry.category }),
    name,
    group: entry.category
      ? AWARD_CATEGORIES[entry.category].group
      : CLUB_AWARDS_GROUP,
    ...(competition && { competition }),
    ...(stat && { stat }),
    winners: [],
  };
  // Until announced, nothing that gives a winner away is published: not
  // the winners, their totals, the photo or the note.
  if (!announced) {
    return artifact;
  }

  artifact.winners = entry.winners.map((playerId) => ({
    playerId,
    ...(stat &&
      !entry.hideTotal && {
        total: statAwardTotal(
          context.games,
          context.seasonId,
          entry.competition,
          stat,
          playerId,
        ),
      }),
  }));
  if (entry.photo) {
    // Generated when the admin left it blank, as for game photos.
    const alt =
      entry.photo.alt ??
      [
        entry.winners
          .map((id) => playerName(context.players, id))
          .join(" and "),
        competition ? `${name} (${competition})` : name,
        context.seasonName,
      ]
        .filter(Boolean)
        .join(", ");
    artifact.photo = { key: entry.photo.key, alt };
  }
  if (entry.note) {
    artifact.note = entry.note;
  }
  return artifact;
}

// awards.json (add-awards). Draft evenings are left out entirely; an
// evening's number counts every evening, drafts included, so it doesn't
// change when one is published.
export function generateAwardsArtifact(
  evenings: AwardEvening[],
  seasons: Season[],
  players: Player[],
  games: Game[],
): AwardsArtifact {
  const seasonNames = new Map(
    seasons.map((season) => [season._id, season.name]),
  );
  const playersById = new Map(players.map((player) => [player._id, player]));
  const ordered = [...evenings].sort((a, b) => a._id.localeCompare(b._id));

  return {
    competitions: [
      awardCompetitionLabel("BOTBC"),
      awardCompetitionLabel("LLIHC"),
    ],
    categories: Object.entries(AWARD_CATEGORIES).map(
      ([key, { name, group }]) => ({
        key,
        name,
        group,
      }),
    ),
    evenings: ordered.flatMap((evening, index) => {
      if (evening.status === "draft") {
        return [];
      }
      const seasonName = seasonNames.get(evening.seasonId) ?? evening.seasonId;
      const announced = evening.status === "announced";
      return [
        {
          season: seasonName,
          number: index + 1,
          status: evening.status,
          awards: evening.entries.map((entry) =>
            awardArtifact(entry, announced, {
              games,
              players: playersById,
              seasonId: evening.seasonId,
              seasonName,
            }),
          ),
        },
      ];
    }),
  };
}
