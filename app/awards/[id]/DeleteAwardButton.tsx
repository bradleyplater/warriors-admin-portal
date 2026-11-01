"use client";

import { Button } from "@/app/_ui";
import { deleteAwardEntryAction } from "../actions";

// Asks first: an award with a photo also loses the file from S3.
export function DeleteAwardButton({
  eveningId,
  entryId,
  name,
}: {
  eveningId: string;
  entryId: string;
  name: string;
}) {
  return (
    <form
      action={deleteAwardEntryAction.bind(null, eveningId, entryId)}
      onSubmit={(event) => {
        if (!window.confirm(`Delete “${name}”? This can't be undone.`)) {
          event.preventDefault();
        }
      }}
    >
      <Button type="submit" variant="danger" size="sm">
        Delete<span className="sr-only"> {name}</span>
      </Button>
    </form>
  );
}
