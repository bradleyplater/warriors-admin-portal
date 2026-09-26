import { NoSuchKey } from "@aws-sdk/client-s3";
import { getOpponent } from "@/lib/repositories";
import { readLogo } from "@/lib/opponent-logos";

// Read-through for logo previews inside the portal (see OpponentLogo). The
// content type comes from the stored, allowlisted value, and the CSP stops
// an uploaded SVG from running script if someone opens this URL directly
// rather than through an <img>, where script never runs anyway.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const opponent = await getOpponent(id);
  if (!opponent?.logo) {
    return new Response("Not found", { status: 404 });
  }

  let body: Uint8Array;
  try {
    body = await readLogo(opponent.logo.key);
  } catch (error) {
    // e.g. seed data, whose logo keys point at no real object locally.
    if (error instanceof NoSuchKey) {
      return new Response("Not found", { status: 404 });
    }
    throw error;
  }
  return new Response(Buffer.from(body), {
    headers: {
      "Content-Type": opponent.logo.contentType,
      "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; sandbox",
      "X-Content-Type-Options": "nosniff",
      // The page links here with ?v=<key>, which changes on every upload.
      "Cache-Control": "private, max-age=31536000, immutable",
    },
  });
}
