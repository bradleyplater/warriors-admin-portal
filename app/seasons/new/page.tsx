import { SeasonForm } from "../SeasonForm";

export default function NewSeasonPage() {
  return (
    <div className="flex flex-col gap-3">
      <h1 className="text-2xl font-semibold">Add new season</h1>
      <SeasonForm />
    </div>
  );
}
