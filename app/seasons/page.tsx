import { listGames, listSeasons } from "@/lib/repositories";
import { sortSeasonsAscending } from "@/lib/derived/season-order";
import { ButtonLink, Card, EmptyState, PageHeader } from "@/app/_ui";

// No dynamic route segment, so Next would otherwise statically prerender
// this page at build time and freeze the list to whatever the database
// held then. Force per-request rendering instead.
export const dynamic = "force-dynamic";

export default async function SeasonsPage() {
  const [seasons, games] = await Promise.all([listSeasons(), listGames()]);
  const orderedSeasons = sortSeasonsAscending(seasons);

  return (
    <div className="flex max-w-3xl flex-col gap-8">
      <PageHeader
        eyebrow="Database"
        title="Seasons"
        actions={<ButtonLink href="/seasons/new">Add new season</ButtonLink>}
      />

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
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
