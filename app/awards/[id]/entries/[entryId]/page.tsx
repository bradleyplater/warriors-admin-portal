import { notFound } from "next/navigation";
import {
  getAwardEvening,
  getSeason,
  listGames,
  listPlayers,
} from "@/lib/repositories";
import { awardCompetitionLabel, awardName } from "@/lib/awards/display";
import {
  awardStat,
  formatStat,
  statAwardLeader,
} from "@/lib/awards/stat-leaders";
import { Button, Card, Message, PageHeader, SectionHeading } from "@/app/_ui";
import {
  applyStatSuggestionAction,
  updateAwardEntryAction,
} from "../../../actions";
import { photoName, playerLabel, playersForPicker } from "../../../players";
import { AwardEntryForm } from "../AwardEntryForm";
import { AwardPhotoUploader } from "./AwardPhotoUploader";
import { DeleteAwardPhotoButton } from "./DeleteAwardPhotoButton";

export default async function EditAwardEntryPage({
  params,
}: {
  params: Promise<{ id: string; entryId: string }>;
}) {
  const { id, entryId } = await params;
  const evening = await getAwardEvening(id);
  const entry = evening?.entries.find((candidate) => candidate._id === entryId);
  if (!evening || !entry) {
    notFound();
  }
  const [season, players, games] = await Promise.all([
    getSeason(evening.seasonId),
    listPlayers(),
    listGames(),
  ]);

  // Most goals/assists/points: who leads from the games, the coach and
  // anyone else flagged left out.
  const stat = awardStat(entry);
  const leader =
    stat &&
    statAwardLeader(games, players, evening.seasonId, entry.competition, stat);
  const leaderNames = leader?.playerIds
    .map((id) => {
      const player = players.find((candidate) => candidate._id === id);
      return player ? playerLabel(player) : id;
    })
    .join(" & ");
  const leaderIsWinner =
    leader &&
    leader.playerIds.length === entry.winners.length &&
    leader.playerIds.every((id) => entry.winners.includes(id));

  return (
    <div className="flex flex-col gap-10">
      <PageHeader
        back={{
          href: `/awards/${evening._id}`,
          label: `Awards ${season?.name ?? evening.seasonId}`,
        }}
        title={awardName(entry)}
        meta={awardCompetitionLabel(entry.competition)}
      />

      {stat && (
        <div className="flex max-w-2xl flex-col items-start gap-3">
          <Message
            tone="info"
            title={
              leader
                ? `From the games: ${leaderNames} · ${formatStat(leader.value, stat)}`
                : `No ${stat} recorded yet`
            }
            data-testid="stat-suggestion"
          >
            Worked out from {awardCompetitionLabel(entry.competition)} games
            this season. Players marked to leave out of the most goals, assists
            and points awards are skipped.
          </Message>
          {leader && !leaderIsWinner && (
            <form
              action={applyStatSuggestionAction.bind(
                null,
                evening._id,
                entry._id,
              )}
            >
              <Button type="submit" variant="secondary" size="sm">
                Use suggestion
              </Button>
            </form>
          )}
        </div>
      )}

      <AwardEntryForm
        eveningId={evening._id}
        entry={entry}
        players={playersForPicker(players)}
        action={updateAwardEntryAction.bind(null, evening._id, entry._id)}
        submitLabel="Save award"
      />

      <section
        className="flex max-w-2xl flex-col gap-4"
        aria-labelledby="photo-heading"
      >
        <SectionHeading>
          <span id="photo-heading">Photo</span>
        </SectionHeading>
        <Card className="flex flex-col gap-4">
          {entry.photo && (
            <div className="flex flex-wrap items-end gap-4">
              {/* eslint-disable-next-line @next/next/no-img-element -- served by our own read-through route; it's already processed WebP */}
              <img
                src={`/awards/${evening._id}/entries/${entry._id}/photo/${photoName(entry.photo.key)}`}
                alt={`Photo for ${awardName(entry)}`}
                className="block aspect-[4/5] w-48 bg-sunken object-cover"
                data-testid="award-photo"
              />
              <DeleteAwardPhotoButton
                eveningId={evening._id}
                entryId={entry._id}
              />
            </div>
          )}
          <AwardPhotoUploader
            eveningId={evening._id}
            entryId={entry._id}
            hasPhoto={entry.photo !== undefined}
          />
          {!entry.photo && (
            <p className="m-0 text-fg-secondary">
              Without a photo, the website shows the back of the winner’s shirt
              — their surname and squad number.
            </p>
          )}
        </Card>
      </section>
    </div>
  );
}
