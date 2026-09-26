"use client";

import { useActionState } from "react";
import { Badge, Button } from "@/app/_ui";
import { publishAction } from "./actions";
import { initialPublishFormState } from "./publish-state";

export function PublishButton() {
  const [state, formAction, pending] = useActionState(
    publishAction,
    initialPublishFormState,
  );

  return (
    <form action={formAction} className="flex items-center gap-3">
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? "Publishing…" : "Publish"}
      </Button>
      {/* The live region wraps only the words, so the badge's glyph isn't
          announced and the status reads exactly "Published". */}
      {state.status === "success" && (
        <Badge tone="success">
          <span role="status">Published</span>
        </Badge>
      )}
      {state.status === "error" && (
        <p role="alert" className="wr-field__error m-0 max-w-xs">
          <span aria-hidden="true">{"✕"} </span>
          {state.message}
        </p>
      )}
    </form>
  );
}
