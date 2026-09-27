import Link from "next/link";
import { listOpponents } from "@/lib/repositories";
import { ButtonLink, Card, EmptyState, PageHeader } from "@/app/_ui";
import { OpponentLogo } from "./OpponentLogo";

// No dynamic route segment, so Next would otherwise statically prerender
// this page at build time and freeze the list — opponents created after
// the server starts must show up without a rebuild.
export const dynamic = "force-dynamic";

export default async function OpponentsPage() {
  const opponents = await listOpponents();

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Opponents"
        actions={<ButtonLink href="/opponents/new">Add opponent</ButtonLink>}
      >
        Teams the Warriors play. Games pick their opponent from this list.
      </PageHeader>

      {opponents.length === 0 ? (
        <EmptyState>No opponents yet.</EmptyState>
      ) : (
        <Card flush>
          <table className="wr-table">
            <thead>
              <tr>
                <th className="w-20">Logo</th>
                <th>Name</th>
                <th className="wr-right w-24">Edit</th>
              </tr>
            </thead>
            <tbody>
              {opponents.map((opponent) => (
                <tr key={opponent._id} className="relative">
                  <td>
                    {/* Whole-row hit target; the name is styled as the
                        visible link. */}
                    <Link
                      href={`/opponents/${opponent._id}/edit`}
                      className="absolute inset-0"
                      aria-label={opponent.name}
                    />
                    <OpponentLogo opponent={opponent} />
                  </td>
                  <td>
                    <span className="text-[color:var(--link)] underline underline-offset-[.15em]">
                      {opponent.name}
                    </span>
                  </td>
                  <td className="wr-right">
                    <ButtonLink
                      href={`/opponents/${opponent._id}/edit`}
                      variant="secondary"
                      size="sm"
                      className="relative z-10"
                    >
                      Edit<span className="sr-only"> {opponent.name}</span>
                    </ButtonLink>
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
