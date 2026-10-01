"use client";

import { useFormStatus } from "react-dom";
import { Button } from "@/app/_ui";
import { setActiveSeasonAction } from "./actions";

function SetActiveButton({ seasonName }: { seasonName: string }) {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      variant="secondary"
      size="sm"
      disabled={pending}
      aria-label={`Set ${seasonName} active`}
    >
      {pending ? "Setting…" : "Set active"}
    </Button>
  );
}

export function SetActiveSeasonForm({
  seasonId,
  seasonName,
}: {
  seasonId: string;
  seasonName: string;
}) {
  return (
    <form action={setActiveSeasonAction.bind(null, seasonId)}>
      <SetActiveButton seasonName={seasonName} />
    </form>
  );
}
