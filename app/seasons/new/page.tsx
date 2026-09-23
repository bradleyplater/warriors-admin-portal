import { PageHeader } from "@/app/_ui";
import { SeasonForm } from "../SeasonForm";

export default function NewSeasonPage() {
  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        back={{ href: "/seasons", label: "Seasons" }}
        title="Add new season"
      />
      <SeasonForm />
    </div>
  );
}
