import { notFound } from "next/navigation";
import { getPlayer } from "@/lib/repositories";
import { PageHeader } from "@/app/_ui";
import { PlayerForm } from "../../PlayerForm";

export default async function EditPlayerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const player = await getPlayer(id);

  if (!player) {
    notFound();
  }

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        back={{ href: "/players", label: "Players" }}
        title={`Edit ${player.firstName} ${player.surname}`}
      />
      <PlayerForm initialValues={player} />
    </div>
  );
}
