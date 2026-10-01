import { listGames, listSeasons } from "@/lib/repositories";
import {
  resolveActiveSeason,
  sortSeasonsAscending,
} from "@/lib/derived/season-order";
import { Badge, ButtonLink, Card, EmptyState, PageHeader } from "@/app/_ui";
import { SetActiveSeasonForm } from "./SetActiveSeasonForm";

// No dynamic route segment, so Next would otherwise statically prerender
// this page at build time and freeze the list to whatever the database
// held then. Force per-request rendering instead.
export const dynamic = "force-dynamic";

export default async function SeasonsPage() {
  const [seasons, games] = await Promise.all([listSeasons(), listGames()]);
  const orderedSeasons = sortSeasonsAscending(seasons);
  // The season the website treats as current. With nothing flagged it is
  // the newest by default, which the badge says so it's visible.
  const activeSeason = resolveActiveSeason(seasons);

  return (
    <div className="flex max-w-3xl flex-col gap-8">
      <PageHeader
        eyebrow="Database"
        title="Seasons"
        actions={<ButtonLink href="/seasons/new">Add new season</ButtonLink>}
      >
        The active season is the one the website shows by default. Publish
        after changing it.
      </PageHeader>

      {orderedSeasons.length === 0 ? (
        <EmptyState>None.</EmptyState>
      ) : (
        <Card flush>
          <table className="wr-table">
            <thead>
              <tr>
                <th>Id</th>
                <th>Name</th>
                <th className="wr-right">Games</th>
                <th>Website</th>
              </tr>
            </thead>
            <tbody>
              {orderedSeasons.map((season) => (
                <tr key={season._id}>
                  <td className="wr-num">{season._id}</td>
                  <td>{season.name}</td>
                  <td className="wr-num wr-right">
                    {
                      games.filter((game) => game.seasonId === season._id)
                        .length
                    }
                  </td>
                  <td>
                    {season._id === activeSeason?._id ? (
                      <Badge tone="success" data-testid="active-season">
                        Active{season.active ? "" : " (default: newest)"}
                      </Badge>
                    ) : (
                      <SetActiveSeasonForm
                        seasonId={season._id}
                        seasonName={season.name}
                      />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
