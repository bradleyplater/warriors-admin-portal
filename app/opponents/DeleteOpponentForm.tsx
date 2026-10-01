"use client";

import { useActionState } from "react";
import { Button, FormErrorSummary } from "@/app/_ui";
import { deleteOpponentAction } from "./actions";
import { initialOpponentFormState, type OpponentFormState } from "./form-state";

export function DeleteOpponentForm({ opponentId }: { opponentId: string }) {
  const [state, formAction, pending] = useActionState<OpponentFormState>(
    deleteOpponentAction.bind(null, opponentId),
    initialOpponentFormState,
  );

  return (
    <form action={formAction} className="flex max-w-md flex-col gap-4">
      <FormErrorSummary errors={state.errors} />
      <p className="m-0 text-fg-secondary">
        Only opponents that no game or upcoming game uses can be deleted.
      </p>
      <div>
        <Button type="submit" variant="danger" disabled={pending}>
          {pending ? "Deleting…" : "Delete opponent"}
        </Button>
      </div>
    </form>
  );
}
