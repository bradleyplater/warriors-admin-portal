import { listOpponents } from "@/lib/repositories";
import { PageHeader } from "@/app/_ui";
import { UpcomingGameForm } from "../UpcomingGameForm";

// The opponent picker must include opponents created after server start.
export const dynamic = "force-dynamic";

export default async function NewUpcomingGamePage() {
  const opponents = await listOpponents();

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        back={{ href: "/upcoming-games", label: "Upcoming games" }}
        title="Add upcoming game"
      />
      <UpcomingGameForm opponents={opponents} />
    </div>
  );
}
