"use client";

import { useActionState } from "react";
import type { GamePhoto } from "@/lib/schemas";
import { Button, TextField } from "@/app/_ui";
import { updateGamePhotoTextAction } from "./actions";
import {
  initialPhotoTextFormState,
  type PhotoTextFormState,
} from "./form-state";

export function PhotoTextForm({
  gameId,
  photo,
  position,
}: {
  gameId: string;
  photo: GamePhoto;
  position: number;
}) {
  const [state, formAction, pending] = useActionState<
    PhotoTextFormState,
    FormData
  >(
    updateGamePhotoTextAction.bind(null, gameId, photo.key),
    initialPhotoTextFormState,
  );
  const id = `photo-${position}`;

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <TextField
        id={`${id}-caption`}
        name="caption"
        label="Caption"
        defaultValue={photo.caption}
        maxLength={250}
        errors={state.errors.caption}
      />
      <TextField
        id={`${id}-alt`}
        name="alt"
        label="Alt text"
        defaultValue={photo.alt}
        maxLength={250}
        hint="Describes the photo for screen readers. Left blank, publishing fills one in."
        errors={state.errors.alt}
      />
      <div className="flex items-center gap-3">
        <Button type="submit" variant="secondary" size="sm" disabled={pending}>
          {pending ? "Saving…" : "Save"}
          <span className="sr-only"> photo {position} text</span>
        </Button>
        {state.saved && !pending && (
          <span role="status" className="t-label text-fg-secondary">
            Saved
          </span>
        )}
      </div>
    </form>
  );
}
