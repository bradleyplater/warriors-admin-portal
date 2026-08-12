import Link from "next/link";
import { listSeasons } from "@/lib/repositories";
import { sortSeasonsAscending } from "@/lib/derived/season-order";

// No dynamic route segment, so Next would otherwise statically prerender
// this page at build time and freeze the list to whatever the database
// held then. Force per-request rendering instead.
export const dynamic = "force-dynamic";

export default async function SeasonsPage() {
  const seasons = await listSeasons();
  const orderedSeasons = sortSeasonsAscending(seasons);

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Seasons</h1>
        <Link
          href="/seasons/new"
          className="rounded border border-black/20 px-3 py-1.5 text-sm font-medium hover:bg-black/[0.03] dark:border-white/20 dark:hover:bg-white/[0.05]"
        >
          Add new season
        </Link>
      </div>

      {orderedSeasons.length === 0 ? (
        <p className="text-sm text-black/60 dark:text-white/60">None.</p>
      ) : (
        <table className="w-full max-w-sm text-left text-sm">
          <thead>
            <tr className="border-b border-black/10 dark:border-white/15">
              <th className="py-2 pr-4 font-medium">Id</th>
              <th className="py-2 pr-4 font-medium">Name</th>
            </tr>
          </thead>
          <tbody>
            {orderedSeasons.map((season) => (
              <tr
                key={season._id}
                className="border-b border-black/5 dark:border-white/10"
              >
                <td className="py-2 pr-4">{season._id}</td>
                <td className="py-2 pr-4">{season.name}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
