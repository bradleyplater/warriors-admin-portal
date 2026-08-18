"use client";

import { useActionState } from "react";
import { publishAction } from "./actions";
import { initialPublishFormState } from "./publish-state";

export function PublishButton() {
  const [state, formAction, pending] = useActionState(
    publishAction,
    initialPublishFormState,
  );

  return (
    <form action={formAction} className="flex items-center gap-2">
      <button
        type="submit"
        disabled={pending}
        className="rounded border border-black/20 px-3 py-1.5 text-sm font-medium hover:bg-black/[0.03] disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/20 dark:hover:bg-white/[0.05]"
      >
        {pending ? "Publishing…" : "Publish"}
      </button>
      {state.status === "success" && (
        <span role="status" className="text-sm text-green-600">
          Published
        </span>
      )}
      {state.status === "error" && (
        <span role="alert" className="text-sm text-red-600">
          {state.message}
        </span>
      )}
    </form>
  );
}
