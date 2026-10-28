"use client";

import { useRef, useState } from "react";
import { MAX_PHOTOS_PER_GAME } from "@/lib/schemas";
import { FieldErrors, Message } from "@/app/_ui";
import { uploadGamePhotoAction } from "./actions";

const PHOTO_ACCEPT = "image/jpeg,image/png,image/webp";

type FileStatus = {
  name: string;
  state: "waiting" | "processing" | "added" | "error" | "skipped";
  message?: string;
};

const STATUS_TEXT: Record<FileStatus["state"], string> = {
  waiting: "Waiting",
  processing: "Processing…",
  added: "Added",
  error: "Not added",
  skipped: "Not added",
};

// Uploads one file per server action call, in turn (add-game-photos design
// D3), so each photo gets its own status and the request body only ever
// carries one photo. Files beyond the remaining slots are skipped up front;
// the server's atomic limit is still what actually enforces it.
export function PhotoUploader({
  gameId,
  remaining,
}: {
  gameId: string;
  remaining: number;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [statuses, setStatuses] = useState<FileStatus[]>([]);
  const [busy, setBusy] = useState(false);

  async function upload(files: File[]) {
    const accepted = files.slice(0, remaining);
    const initial: FileStatus[] = files.map((file, index) =>
      index < remaining
        ? { name: file.name, state: "waiting" }
        : {
            name: file.name,
            state: "skipped",
            message: `The game already has ${MAX_PHOTOS_PER_GAME} photos`,
          },
    );
    setStatuses(initial);
    setBusy(true);

    const update = (index: number, status: Partial<FileStatus>) =>
      setStatuses((current) =>
        current.map((entry, i) =>
          i === index ? { ...entry, ...status } : entry,
        ),
      );

    for (const [index, file] of accepted.entries()) {
      update(index, { state: "processing" });
      const formData = new FormData();
      formData.set("photo", file);
      try {
        const result = await uploadGamePhotoAction(gameId, formData);
        update(
          index,
          result.ok
            ? { state: "added" }
            : { state: "error", message: result.error },
        );
      } catch {
        update(index, { state: "error", message: "Upload failed — try again" });
      }
    }

    setBusy(false);
    if (input.current) input.current.value = "";
  }

  return (
    <div className="flex flex-col gap-3">
      {remaining <= 0 && !busy ? (
        <Message tone="info">
          This game has the maximum of {MAX_PHOTOS_PER_GAME} photos. Delete one
          to add another.
        </Message>
      ) : (
        <div className="wr-field">
          <label htmlFor="photos" className="wr-field__label">
            Add photos
          </label>
          <input
            ref={input}
            id="photos"
            type="file"
            multiple
            accept={PHOTO_ACCEPT}
            disabled={busy}
            className="wr-input"
            aria-describedby="photos-hint"
            onChange={(event) => {
              const files = Array.from(event.target.files ?? []);
              if (files.length > 0) void upload(files);
            }}
          />
          <p id="photos-hint" className="wr-field__hint">
            JPEG, PNG or WebP, up to 25 MB each. {remaining} of{" "}
            {MAX_PHOTOS_PER_GAME} slots left. iPhone photos must be JPEG, not
            HEIC. Photos are resized for the website and location data is
            removed.
          </p>
        </div>
      )}

      {statuses.length > 0 && (
        <ul
          aria-live="polite"
          data-testid="photo-upload-status"
          className="m-0 flex list-none flex-col gap-1 p-0"
        >
          {statuses.map((status, index) => (
            <li key={`${index}-${status.name}`} className="flex flex-col gap-1">
              <span>
                <span className="t-data">{status.name}</span>
                <span className="t-label text-fg-secondary">
                  {" "}
                  · {STATUS_TEXT[status.state]}
                </span>
              </span>
              {status.message && <FieldErrors messages={[status.message]} />}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
