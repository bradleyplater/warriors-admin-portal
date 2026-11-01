import { notFound } from "next/navigation";
import { getAwardEvening, getSeason, listPlayers } from "@/lib/repositories";
import { PageHeader } from "@/app/_ui";
import { createAwardEntryAction } from "../../../actions";
import { playersForPicker } from "../../../players";
import { AwardEntryForm } from "../AwardEntryForm";

export default async function NewAwardEntryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const evening = await getAwardEvening(id);
  if (!evening) {
    notFound();
  }
  const [season, players] = await Promise.all([
    getSeason(evening.seasonId),
    listPlayers(),
  ]);

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        back={{
          href: `/awards/${evening._id}`,
          label: `Awards ${season?.name ?? evening.seasonId}`,
        }}
        title="Add award"
      />
      <AwardEntryForm
        eveningId={evening._id}
        players={playersForPicker(players)}
        action={createAwardEntryAction.bind(null, evening._id)}
        submitLabel="Add award"
      />
    </div>
  );
}
