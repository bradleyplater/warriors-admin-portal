import { notFound } from "next/navigation";
import {
  getAwardEvening,
  getSeason,
  listGames,
  listPlayers,
} from "@/lib/repositories";
import { AWARD_EVENING_STATUSES } from "@/lib/schemas";
import {
  AWARD_STATUS_LABELS,
  awardCompetitionLabel,
  awardName,
} from "@/lib/awards/display";
import {
  Badge,
  Button,
  ButtonLink,
  Card,
  Choice,
  Fieldset,
  PageHeader,
  SectionHeading,
} from "@/app/_ui";
import {
  addStandardAwardsAction,
  moveAwardEntryAction,
  setAwardEveningStatusAction,
} from "../actions";
import { photoName } from "../players";
import { describeAwardWinners, type AwardWinnerText } from "../winners";
import { STATUS_TONES } from "../status-tones";
import { DeleteAwardButton } from "./DeleteAwardButton";

function WinnerCell({ winners, suggestion }: AwardWinnerText) {
  if (winners) {
    return <>{winners}</>;
  }
  return (
    <>
      <span className="text-fg-secondary">To be announced</span>
      {suggestion && (
        <span className="t-data block text-fg-secondary">
          Suggested: {suggestion}
        </span>
      )}
    </>
  );
}

export default async function AwardEveningPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const evening = await getAwardEvening(id);
  if (!evening) {
    notFound();
  }

  const [season, players, games] = await Promise.all([
    getSeason(evening.seasonId),
    listPlayers(),
    listGames(),
  ]);
  const seasonName = season?.name ?? evening.seasonId;
  const winnerContext = { games, players, seasonId: evening.seasonId };
  const toAnnounce = evening.entries.filter(
    (entry) => entry.winners.length === 0,
  ).length;

  return (
    <div className="flex flex-col gap-10">
      <PageHeader
        back={{ href: "/awards", label: "Awards" }}
        title={`Awards ${seasonName}`}
        meta={
          <Badge tone={STATUS_TONES[evening.status]}>
            {AWARD_STATUS_LABELS[evening.status].label}
          </Badge>
        }
      />

      <section className="flex flex-col gap-4" aria-labelledby="status-heading">
        <SectionHeading>
          <span id="status-heading">Website</span>
        </SectionHeading>
        <Card className="max-w-2xl">
          <form
            action={setAwardEveningStatusAction.bind(null, evening._id)}
            className="flex flex-col gap-4"
          >
            <Fieldset legend="Show this evening">
              <div className="flex flex-col gap-2">
                {AWARD_EVENING_STATUSES.map((status) => (
                  <Choice
                    key={status}
                    type="radio"
                    name="status"
                    value={status}
                    defaultChecked={evening.status === status}
                  >
                    <span>
                      <span className="wr-strong">
                        {AWARD_STATUS_LABELS[status].label}
                      </span>
                      <span className="text-fg-secondary">
                        {" "}
                        — {AWARD_STATUS_LABELS[status].description}
                      </span>
                    </span>
                  </Choice>
                ))}
              </div>
            </Fieldset>
            <div>
              <Button type="submit" variant="secondary">
                Save
              </Button>
            </div>
          </form>
        </Card>
      </section>

      <section className="flex flex-col gap-4" aria-labelledby="awards-heading">
        <SectionHeading
          count={
            toAnnounce > 0
              ? `${evening.entries.length} · ${toAnnounce} to be announced`
              : evening.entries.length
          }
          countTestId="award-count"
          actions={
            <ButtonLink href={`/awards/${evening._id}/entries/new`}>
              Add award
            </ButtonLink>
          }
        >
          <span id="awards-heading">Awards</span>
        </SectionHeading>

        {evening.entries.length === 0 ? (
          <Card className="flex flex-col items-start gap-4">
            <p className="m-0 max-w-measure text-fg-secondary">
              No awards yet. Start from the standard set — each competition’s
              MVP, players’ player, performance and most improved awards, plus
              the coaches’ and manager’s honours — then add the club awards.
            </p>
            <form action={addStandardAwardsAction.bind(null, evening._id)}>
              <Button type="submit" variant="secondary">
                Add the standard awards
              </Button>
            </form>
          </Card>
        ) : (
          <Card flush>
            <table className="wr-table">
              <thead>
                <tr>
                  <th>Award</th>
                  <th>Competition</th>
                  <th>Winner</th>
                  <th>Photo</th>
                  <th className="wr-right">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {evening.entries.map((entry, index) => {
                  const name = awardName(entry);
                  const label = `${name} (${awardCompetitionLabel(entry.competition)})`;
                  return (
                    <tr key={entry._id} data-testid="award-entry">
                      <td>
                        <span className="wr-strong">{name}</span>
                        {entry.note && (
                          <span className="t-data block text-fg-secondary">
                            {entry.note}
                          </span>
                        )}
                      </td>
                      <td className="t-label">
                        {awardCompetitionLabel(entry.competition)}
                      </td>
                      <td>
                        <WinnerCell
                          {...describeAwardWinners(entry, winnerContext)}
                        />
                      </td>
                      <td>
                        {entry.photo ? (
                          // eslint-disable-next-line @next/next/no-img-element -- served by our own read-through route; it's already processed WebP
                          <img
                            src={`/awards/${evening._id}/entries/${entry._id}/photo/${photoName(entry.photo.key)}`}
                            alt=""
                            className="block h-12 w-10 bg-sunken object-cover"
                            loading="lazy"
                          />
                        ) : (
                          <span className="text-fg-secondary">—</span>
                        )}
                      </td>
                      <td>
                        <div className="flex flex-wrap justify-end gap-2">
                          <ButtonLink
                            href={`/awards/${evening._id}/entries/${entry._id}`}
                            variant="secondary"
                            size="sm"
                          >
                            Edit<span className="sr-only"> {label}</span>
                          </ButtonLink>
                          {index > 0 && (
                            <form
                              action={moveAwardEntryAction.bind(
                                null,
                                evening._id,
                                entry._id,
                                "earlier",
                              )}
                            >
                              <Button type="submit" variant="ghost" size="sm">
                                <span aria-hidden="true">↑</span>
                                <span className="sr-only">Move {label} up</span>
                              </Button>
                            </form>
                          )}
                          {index < evening.entries.length - 1 && (
                            <form
                              action={moveAwardEntryAction.bind(
                                null,
                                evening._id,
                                entry._id,
                                "later",
                              )}
                            >
                              <Button type="submit" variant="ghost" size="sm">
                                <span aria-hidden="true">↓</span>
                                <span className="sr-only">
                                  Move {label} down
                                </span>
                              </Button>
                            </form>
                          )}
                          <DeleteAwardButton
                            eveningId={evening._id}
                            entryId={entry._id}
                            name={label}
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Card>
        )}
      </section>
    </div>
  );
}
