import {
  getGamesLatestUpdatedAt,
  getLatestSuccessfulPublish,
  getPlayersLatestUpdatedAt,
  getSeasonsLatestUpdatedAt,
  getTeamLatestUpdatedAt,
} from "../repositories";
import type { Publishes } from "../schemas";

export interface PublishStatus {
  hasUnpublishedChanges: boolean;
  lastPublish: Publishes | null;
}

// The unpublished-changes indicator's decision rule (see
// docs/02-architecture.md#the-publish-pipeline): unpublished whenever data
// has changed more recently than the last successful publish completed, or
// there's data but no successful publish has ever completed. No data at all
// (fresh/empty database) is "up to date" — there's nothing to publish.
export function hasUnpublishedChangesSince(
  latestUpdatedAt: Date | null,
  lastPublishCompletedAt: Date | undefined,
): boolean {
  if (latestUpdatedAt === null) {
    return false;
  }
  if (lastPublishCompletedAt === undefined) {
    return true;
  }
  return latestUpdatedAt > lastPublishCompletedAt;
}

// One indexed query per collection (see the { updatedAt: -1 } indexes in
// internal/indexes.ts) — cheap, and covers every entity type so the
// indicator can never false-negative.
export async function getPublishStatus(): Promise<PublishStatus> {
  const [playersUpdatedAt, gamesUpdatedAt, seasonsUpdatedAt, teamUpdatedAt, lastPublish] =
    await Promise.all([
      getPlayersLatestUpdatedAt(),
      getGamesLatestUpdatedAt(),
      getSeasonsLatestUpdatedAt(),
      getTeamLatestUpdatedAt(),
      getLatestSuccessfulPublish(),
    ]);

  const latestUpdatedAt = [playersUpdatedAt, gamesUpdatedAt, seasonsUpdatedAt, teamUpdatedAt]
    .filter((date): date is Date => date !== null)
    .reduce<Date | null>(
      (latest, date) => (latest === null || date > latest ? date : latest),
      null,
    );

  return {
    hasUnpublishedChanges: hasUnpublishedChangesSince(
      latestUpdatedAt,
      lastPublish?.completedAt,
    ),
    lastPublish,
  };
}
