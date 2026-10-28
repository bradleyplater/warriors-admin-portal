"use client";

import { Button } from "@/app/_ui";
import { deleteGamePhotoAction } from "./actions";

// Unlike goal/penalty deletes, this one asks first: it also deletes the
// processed file from S3, so there's nothing to recover afterwards.
export function DeletePhotoButton({
  gameId,
  photoKey,
  position,
}: {
  gameId: string;
  photoKey: string;
  position: number;
}) {
  return (
    <form
      action={deleteGamePhotoAction.bind(null, gameId, photoKey)}
      onSubmit={(event) => {
        if (
          !window.confirm(`Delete photo ${position}? This can't be undone.`)
        ) {
          event.preventDefault();
        }
      }}
    >
      <Button type="submit" variant="danger" size="sm">
        Delete<span className="sr-only"> photo {position}</span>
      </Button>
    </form>
  );
}
