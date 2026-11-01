import Link from "next/link";
import { listAwardEvenings, listSeasons } from "@/lib/repositories";
import { sortSeasonsAscending } from "@/lib/derived/season-order";
import { AWARD_STATUS_LABELS } from "@/lib/awards/display";
import {
  Badge,
  ButtonLink,
  Card,
  EmptyState,
  PageHeader,
  SectionHeading,
} from "@/app/_ui";
import { NewEveningForm } from "./NewEveningForm";
import { STATUS_TONES } from "./status-tones";

// No dynamic route segment, so Next would otherwise statically prerender
// this page at build time and freeze the list.
export const dynamic = "force-dynamic";

export default async function AwardsPage() {
  const [evenings, seasons] = await Promise.all([
    listAwardEvenings(),
    listSeasons(),
  ]);
  const seasonNames = new Map(
    seasons.map((season) => [season._id, season.name]),
  );
  const taken = new Set(evenings.map((evening) => evening.seasonId));
  // Newest first, so the season most likely to need one is preselected.
  const available = sortSeasonsAscending(seasons)
    .filter((season) => !taken.has(season._id))
    .reverse();

  return (
    <div className="flex max-w-4xl flex-col gap-8">
      <PageHeader title="Awards">
        One awards evening per season. Nothing reaches the website until an
        evening is listed or announced, and published.
      </PageHeader>

      {available.length > 0 && (
        <section className="flex flex-col gap-4" aria-labelledby="new-heading">
          <SectionHeading>
            <span id="new-heading">New awards evening</span>
          </SectionHeading>
          <Card>
            <NewEveningForm seasons={available} />
          </Card>
        </section>
      )}

      <section
        className="flex flex-col gap-4"
        aria-labelledby="evenings-heading"
      >
        <SectionHeading count={evenings.length}>
          <span id="evenings-heading">Evenings</span>
        </SectionHeading>
        {evenings.length === 0 ? (
          <EmptyState>No awards evenings yet.</EmptyState>
        ) : (
          <Card flush>
            <table className="wr-table">
              <thead>
                <tr>
                  <th>Season</th>
                  <th>Status</th>
                  <th className="wr-right">Awards</th>
                  <th className="wr-right">To be announced</th>
                  <th className="wr-right w-24">Edit</th>
                </tr>
              </thead>
              <tbody>
                {[...evenings].reverse().map((evening) => {
                  const name =
                    seasonNames.get(evening.seasonId) ?? evening.seasonId;
                  return (
                    <tr key={evening._id} className="relative">
                      <td>
                        {/* Whole-row hit target, as on the opponents list. */}
                        <Link
                          href={`/awards/${evening._id}`}
                          className="absolute inset-0"
                          aria-label={`Awards ${name}`}
                        />
                        <span className="text-[color:var(--link)] underline underline-offset-[.15em]">
                          {name}
                        </span>
                      </td>
                      <td>
                        <Badge tone={STATUS_TONES[evening.status]}>
                          {AWARD_STATUS_LABELS[evening.status].label}
                        </Badge>
                      </td>
                      <td className="wr-num wr-right">
                        {evening.entries.length}
                      </td>
                      <td className="wr-num wr-right">
                        {
                          evening.entries.filter(
                            (entry) => entry.winners.length === 0,
                          ).length
                        }
                      </td>
                      <td className="wr-right">
                        <ButtonLink
                          href={`/awards/${evening._id}`}
                          variant="secondary"
                          size="sm"
                          className="relative z-10"
                        >
                          Edit<span className="sr-only"> {name}</span>
                        </ButtonLink>
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
