import { notFound } from "next/navigation";
import { getAwardEvening, getSeason, listPlayers } from "@/lib/repositories";
import { awardCompetitionLabel, awardName } from "@/lib/awards/display";
import { Card, PageHeader, SectionHeading } from "@/app/_ui";
import { updateAwardEntryAction } from "../../../actions";
import { photoName, playersForPicker } from "../../../players";
import { AwardEntryForm } from "../AwardEntryForm";
import { AwardPhotoUploader } from "./AwardPhotoUploader";
import { DeleteAwardPhotoButton } from "./DeleteAwardPhotoButton";

export default async function EditAwardEntryPage({
  params,
}: {
  params: Promise<{ id: string; entryId: string }>;
}) {
  const { id, entryId } = await params;
  const evening = await getAwardEvening(id);
  const entry = evening?.entries.find((candidate) => candidate._id === entryId);
  if (!evening || !entry) {
    notFound();
  }
  const [season, players] = await Promise.all([
    getSeason(evening.seasonId),
    listPlayers(),
  ]);

  return (
    <div className="flex flex-col gap-10">
      <PageHeader
        back={{
          href: `/awards/${evening._id}`,
          label: `Awards ${season?.name ?? evening.seasonId}`,
        }}
        title={awardName(entry)}
        meta={awardCompetitionLabel(entry.competition)}
      />

      <AwardEntryForm
        eveningId={evening._id}
        entry={entry}
        players={playersForPicker(players)}
        action={updateAwardEntryAction.bind(null, evening._id, entry._id)}
        submitLabel="Save award"
      />

      <section
        className="flex max-w-2xl flex-col gap-4"
        aria-labelledby="photo-heading"
      >
        <SectionHeading>
          <span id="photo-heading">Photo</span>
        </SectionHeading>
        <Card className="flex flex-col gap-4">
          {entry.photo && (
            <div className="flex flex-wrap items-end gap-4">
              {/* eslint-disable-next-line @next/next/no-img-element -- served by our own read-through route; it's already processed WebP */}
              <img
                src={`/awards/${evening._id}/entries/${entry._id}/photo/${photoName(entry.photo.key)}`}
                alt={`Photo for ${awardName(entry)}`}
                className="block aspect-[4/5] w-48 bg-sunken object-cover"
                data-testid="award-photo"
              />
              <DeleteAwardPhotoButton
                eveningId={evening._id}
                entryId={entry._id}
              />
            </div>
          )}
          <AwardPhotoUploader
            eveningId={evening._id}
            entryId={entry._id}
            hasPhoto={entry.photo !== undefined}
          />
          {!entry.photo && (
            <p className="m-0 text-fg-secondary">
              Without a photo, the website shows the back of the winner’s shirt
              — their surname and squad number.
            </p>
          )}
        </Card>
      </section>
    </div>
  );
}
