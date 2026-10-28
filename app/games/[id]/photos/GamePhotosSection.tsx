import type { Game } from "@/lib/schemas";
import { MAX_PHOTOS_PER_GAME } from "@/lib/schemas";
import { Button, Card, EmptyState, SectionHeading } from "@/app/_ui";
import { moveGamePhotoAction } from "./actions";
import { DeletePhotoButton } from "./DeletePhotoButton";
import { PhotoTextForm } from "./PhotoTextForm";
import { PhotoUploader } from "./PhotoUploader";

// The photo's file name within its game's prefix — the read-through route's
// [name] segment.
function photoName(key: string): string {
  return key.slice(key.lastIndexOf("/") + 1);
}

export function GamePhotosSection({ game }: { game: Game }) {
  const photos = game.photos ?? [];
  const remaining = MAX_PHOTOS_PER_GAME - photos.length;

  return (
    <section className="flex flex-col gap-4" aria-labelledby="photos-heading">
      <SectionHeading
        count={`${photos.length} of ${MAX_PHOTOS_PER_GAME}`}
        countTestId="photo-count"
      >
        <span id="photos-heading">Photos</span>
      </SectionHeading>

      <Card>
        <PhotoUploader gameId={game._id} remaining={remaining} />
      </Card>

      {photos.length === 0 ? (
        <EmptyState>
          No photos yet. The website shows placeholders until some are added.
        </EmptyState>
      ) : (
        <ol className="m-0 grid list-none gap-4 p-0 md:grid-cols-2 xl:grid-cols-3">
          {photos.map((photo, index) => {
            const position = index + 1;
            return (
              <li key={photo.key} data-testid="game-photo">
                <Card className="flex h-full flex-col gap-4">
                  {/* eslint-disable-next-line @next/next/no-img-element -- served by our own read-through route; it's already processed WebP */}
                  <img
                    src={`/games/${game._id}/photos/${photoName(photo.key)}`}
                    alt={photo.alt ?? `Photo ${position}`}
                    className="aspect-video w-full bg-sunken object-contain"
                    loading="lazy"
                  />
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="t-label text-fg-secondary">
                      Photo {position}
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {index > 0 && (
                        <form
                          action={moveGamePhotoAction.bind(
                            null,
                            game._id,
                            photo.key,
                            "earlier",
                          )}
                        >
                          <Button type="submit" variant="secondary" size="sm">
                            <span aria-hidden="true">←</span> Earlier
                            <span className="sr-only">
                              {" "}
                              (move photo {position})
                            </span>
                          </Button>
                        </form>
                      )}
                      {index < photos.length - 1 && (
                        <form
                          action={moveGamePhotoAction.bind(
                            null,
                            game._id,
                            photo.key,
                            "later",
                          )}
                        >
                          <Button type="submit" variant="secondary" size="sm">
                            Later <span aria-hidden="true">→</span>
                            <span className="sr-only">
                              {" "}
                              (move photo {position})
                            </span>
                          </Button>
                        </form>
                      )}
                      <DeletePhotoButton
                        gameId={game._id}
                        photoKey={photo.key}
                        position={position}
                      />
                    </div>
                  </div>
                  <PhotoTextForm
                    gameId={game._id}
                    photo={photo}
                    position={position}
                  />
                </Card>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
