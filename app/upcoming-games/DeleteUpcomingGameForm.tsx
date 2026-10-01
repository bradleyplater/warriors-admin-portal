"use client";

import { useFormStatus } from "react-dom";
import { Button } from "@/app/_ui";
import { deleteUpcomingGameAction } from "./actions";

function DeleteButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="danger" disabled={pending}>
      {pending ? "Deleting…" : "Delete upcoming game"}
    </Button>
  );
}

export function DeleteUpcomingGameForm({ upcomingGameId }: { upcomingGameId: string }) {
  return (
    <form
      action={deleteUpcomingGameAction.bind(null, upcomingGameId)}
      className="flex max-w-md flex-col gap-4"
    >
      <p className="m-0 text-fg-secondary">
        Removes it from the schedule. Publish afterwards to update the website.
      </p>
      <div>
        <DeleteButton />
      </div>
    </form>
  );
}
