import type { Game, Opponent, Season } from "../../schemas";
import { competitionLabel } from "./competition";
import { deriveResultsScore, type ResultsScore } from "../../derived/game-periods";

export interface ResultArtifact {
  season: string;
  opponentTeam: string;
  logoImage?: string;
  date: string;
  seasonId: string;
  roster: string[];
  manOfTheMatchPlayerId: string;
  warriorOfTheGamePlayerId: string;
  netminderPlayerId: string;
  competition: string;
  location: string;
  score: ResultsScore;
  photos?: ResultPhotoArtifact[];
}

export interface ResultPhotoArtifact {
  key: string;
  alt: string;
  caption?: string;
}

// Legacy sentinel for a genuinely unset award/netminder field — see
// fixtures/golden/results.json. These fields are optional on Game, so a
// real (post-migration) game can legitimately have none of them set yet.
const MISSING = "MISSING";

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];
const LONDON_DATE_PARTS = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Europe/London",
  day: "numeric",
  month: "numeric",
  year: "numeric",
});

// "12 Oct 2026" on the club's calendar. Built from numeric parts because
// en-GB's own short month varies by ICU version ("Sep" vs "Sept").
function formatGameDate(date: Date): string {
  const part = (type: string) =>
    Number(
      LONDON_DATE_PARTS.formatToParts(date).find((p) => p.type === type)?.value,
    );
  return `${part("day")} ${MONTHS[part("month") - 1]} ${part("year")}`;
}

// Publish fills in alt text the admin left blank (add-game-photos design
// D8), so the website never shows an image with no description.
function photosFor(
  game: Game,
  opponentName: string,
): ResultPhotoArtifact[] | undefined {
  const photos = game.photos ?? [];
  if (photos.length === 0) return undefined;
  return photos.map((photo, index) => ({
    key: photo.key,
    alt:
      photo.alt ??
      `Photo ${index + 1} of ${photos.length} from Warriors v ${opponentName}, ${formatGameDate(game.date)}`,
    ...(photo.caption && { caption: photo.caption }),
  }));
}

// results.json (fixtures/golden/README.md). `season`/`seasonId` both
// resolve to the season's *name* ("24/25"), matching the legacy fixture, not
// the internal SSN#### id. The opponent is enriched from the Opponent
// collection at generation time (add-opponents design D8): its current name,
// plus `logoImage` as the logo's S3 key — omitted when it has no logo. That
// key replaces the legacy bare filename, so the website must resolve it
// against the CDN rather than its own images folder.
export function generateResultsArtifact(
  games: Game[],
  seasons: Season[],
  opponents: Opponent[],
): ResultArtifact[] {
  const seasonNameById = new Map(
    seasons.map((season) => [season._id, season.name]),
  );
  const opponentById = new Map(
    opponents.map((opponent) => [opponent._id, opponent]),
  );

  return [...games]
    .sort((a, b) => a.date.getTime() - b.date.getTime())
    .map((game) => {
      const seasonName = seasonNameById.get(game.seasonId) ?? game.seasonId;
      const opponent = opponentById.get(game.opponentTeam.opponentId);
      if (!opponent) {
        // Publishing an entry with no opponent name would silently break the
        // website's results page — fail the whole generation instead.
        throw new Error(
          `Game ${game._id} references opponent ${game.opponentTeam.opponentId}, which does not exist`,
        );
      }
      const score = deriveResultsScore(
        game.team.goals,
        game.opponentTeam.goals,
        game.team.penalties,
        game.opponentTeam.penalties,
      );

      const photos = photosFor(game, opponent.name);

      return {
        season: seasonName,
        opponentTeam: opponent.name,
        ...(opponent.logo && { logoImage: opponent.logo.key }),
        date: game.date.toISOString(),
        seasonId: seasonName,
        roster: game.team.roster.map((entry) => entry.playerId),
        manOfTheMatchPlayerId: game.manOfTheMatchPlayerId ?? MISSING,
        warriorOfTheGamePlayerId: game.warriorOfTheGamePlayerId ?? MISSING,
        netminderPlayerId: game.netminderPlayerId ?? MISSING,
        competition: competitionLabel(game.type),
        location: game.location,
        score,
        ...(photos && { photos }),
      };
    });
}
