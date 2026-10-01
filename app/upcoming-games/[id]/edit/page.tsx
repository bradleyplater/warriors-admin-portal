import { notFound } from "next/navigation";
import { getUpcomingGame, listOpponents } from "@/lib/repositories";
import { PageHeader, SectionHeading } from "@/app/_ui";
import { UpcomingGameForm } from "../../UpcomingGameForm";
import { DeleteUpcomingGameForm } from "../../DeleteUpcomingGameForm";

export default async function EditUpcomingGamePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [upcomingGame, opponents] = await Promise.all([
    getUpcomingGame(id),
    listOpponents(),
  ]);

  if (!upcomingGame) {
    notFound();
  }

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        back={{ href: "/upcoming-games", label: "Upcoming games" }}
        title="Edit upcoming game"
      />

      <UpcomingGameForm opponents={opponents} initialValues={upcomingGame} />

      <div className="flex flex-col gap-4">
        <SectionHeading>Delete</SectionHeading>
        <DeleteUpcomingGameForm upcomingGameId={upcomingGame._id} />
      </div>
    </div>
  );
}
