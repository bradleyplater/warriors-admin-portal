"use client";

import { Button } from "@/app/_ui";
import { deleteAwardPhotoAction } from "../../../actions";

// Asks first, like game photo deletes: the file goes from S3 too.
export function DeleteAwardPhotoButton({
  eveningId,
  entryId,
}: {
  eveningId: string;
  entryId: string;
}) {
  return (
    <form
      action={deleteAwardPhotoAction.bind(null, eveningId, entryId)}
      onSubmit={(event) => {
        if (!window.confirm("Delete this photo? This can't be undone.")) {
          event.preventDefault();
        }
      }}
    >
      <Button type="submit" variant="danger" size="sm">
        Delete photo
      </Button>
    </form>
  );
}
