import { NoSuchKey } from "@aws-sdk/client-s3";
import { getAwardEvening } from "@/lib/repositories";
import { readPhoto } from "@/lib/game-photos";

// Read-through for award photo thumbnails inside the portal, like the game
// photo route. Only the award's current photo is served, so the route can't
// be used to read arbitrary bucket objects.
export async function GET(
  _request: Request,
  {
    params,
  }: { params: Promise<{ id: string; entryId: string; name: string }> },
) {
  const { id, entryId, name } = await params;
  const key = `awards/${id}/${entryId}/${name}`;
  const evening = await getAwardEvening(id);
  const entry = evening?.entries.find((candidate) => candidate._id === entryId);
  if (entry?.photo?.key !== key) {
    return new Response("Not found", { status: 404 });
  }

  let body: Uint8Array;
  try {
    body = await readPhoto(key);
  } catch (error) {
    if (error instanceof NoSuchKey) {
      return new Response("Not found", { status: 404 });
    }
    throw error;
  }
  return new Response(Buffer.from(body), {
    headers: {
      "Content-Type": "image/webp",
      "X-Content-Type-Options": "nosniff",
      // Keys are never reused for different content.
      "Cache-Control": "private, max-age=31536000, immutable",
    },
  });
}
