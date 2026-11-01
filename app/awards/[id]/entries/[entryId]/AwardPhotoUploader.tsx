"use client";

import { useRef, useState } from "react";
import { FieldErrors } from "@/app/_ui";
import { uploadAwardPhotoAction } from "../../../actions";

const PHOTO_ACCEPT = "image/jpeg,image/png,image/webp";

// One photo per award, uploaded as soon as it's chosen. Replacing is just
// choosing another.
export function AwardPhotoUploader({
  eveningId,
  entryId,
  hasPhoto,
}: {
  eveningId: string;
  entryId: string;
  hasPhoto: boolean;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  async function upload(file: File) {
    setBusy(true);
    setError(undefined);
    const formData = new FormData();
    formData.set("photo", file);
    try {
      const result = await uploadAwardPhotoAction(eveningId, entryId, formData);
      if (!result.ok) setError(result.error);
    } catch {
      setError("Upload failed — try again");
    }
    setBusy(false);
    if (input.current) input.current.value = "";
  }

  return (
    <div className="wr-field">
      <label htmlFor="photo" className="wr-field__label">
        {hasPhoto ? "Replace photo" : "Add a photo"}
      </label>
      <input
        ref={input}
        id="photo"
        type="file"
        accept={PHOTO_ACCEPT}
        disabled={busy}
        className="wr-input"
        aria-describedby="photo-hint"
        aria-invalid={error ? true : undefined}
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void upload(file);
        }}
      />
      <p id="photo-hint" className="wr-field__hint" aria-live="polite">
        {busy
          ? "Processing…"
          : "A photo from the night for this award. JPEG, PNG or WebP, up to 25 MB; portrait works best. Location data is removed."}
      </p>
      {error && <FieldErrors messages={[error]} />}
    </div>
  );
}
