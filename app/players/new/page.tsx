import { PageHeader } from "@/app/_ui";
import { PlayerForm } from "../PlayerForm";

export default function NewPlayerPage() {
  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        back={{ href: "/players", label: "Players" }}
        title="Add new player"
      />
      <PlayerForm />
    </div>
  );
}
