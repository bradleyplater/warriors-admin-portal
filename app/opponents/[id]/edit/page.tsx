import { notFound } from "next/navigation";
import { getOpponent } from "@/lib/repositories";
import { PageHeader, SectionHeading } from "@/app/_ui";
import { OpponentForm } from "../../OpponentForm";
import { OpponentLogo } from "../../OpponentLogo";
import { DeleteOpponentForm } from "../../DeleteOpponentForm";

export default async function EditOpponentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const opponent = await getOpponent(id);

  if (!opponent) {
    notFound();
  }

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        back={{ href: "/opponents", label: "Opponents" }}
        title={`Edit ${opponent.name}`}
      />

      <div className="flex flex-col gap-3">
        <span className="t-label text-fg-secondary">Current logo</span>
        <OpponentLogo opponent={opponent} size={96} />
      </div>

      <OpponentForm initialValues={opponent} />

      <div className="flex flex-col gap-4">
        <SectionHeading>Delete</SectionHeading>
        <DeleteOpponentForm opponentId={opponent._id} />
      </div>
    </div>
  );
}
