import { NoSuchKey } from "@aws-sdk/client-s3";
import { getGame } from "@/lib/repositories";
import { readPhoto } from "@/lib/game-photos";

// Read-through for photo thumbnails inside the portal, like the opponent
// logo route (add-game-photos design D7). Only keys actually on this game
// are served, so the route can't be used to read arbitrary bucket objects.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string; name: string }> },
) {
  const { id, name } = await params;
  const key = `games/${id}/photos/${name}`;
  const game = await getGame(id);
  if (!game?.photos?.some((photo) => photo.key === key)) {
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
      // Keys are never reused for different content (design D4).
      "Cache-Control": "private, max-age=31536000, immutable",
    },
  });
}
