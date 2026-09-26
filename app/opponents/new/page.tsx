import { PageHeader } from "@/app/_ui";
import { OpponentForm } from "../OpponentForm";

export default function NewOpponentPage() {
  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        back={{ href: "/opponents", label: "Opponents" }}
        title="Add opponent"
      />
      <OpponentForm />
    </div>
  );
}
