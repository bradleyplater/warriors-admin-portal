import { notFound } from "next/navigation";
import { getPlayer } from "@/lib/repositories";
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
    <div className="flex flex-col gap-3">
      <h1 className="text-2xl font-semibold">
        Edit {player.firstName} {player.surname}
      </h1>
      <PlayerForm initialValues={player} />
    </div>
  );
}
