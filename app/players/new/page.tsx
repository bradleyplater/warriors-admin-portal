import { PlayerForm } from "../PlayerForm";

export default function NewPlayerPage() {
  return (
    <div className="flex flex-col gap-3">
      <h1 className="text-2xl font-semibold">Add new player</h1>
      <PlayerForm />
    </div>
  );
}
