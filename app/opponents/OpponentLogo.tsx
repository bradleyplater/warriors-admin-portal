import type { Opponent } from "@/lib/schemas";

// Served through the portal's read-through route (app/opponents/[id]/logo)
// so previews work against both the local S3 emulator and the real bucket
// without needing a CDN URL configured. The key in the query string changes
// on every upload, so the browser never shows a stale cached logo.
export function OpponentLogo({
  opponent,
  size = 40,
}: {
  opponent: Opponent;
  size?: number;
}) {
  if (!opponent.logo) {
    return (
      <span
        className="t-label inline-flex items-center justify-center border border-dashed border-hairline text-fg-secondary"
        style={{ width: size, height: size, fontSize: 10 }}
      >
        No logo
      </span>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element -- served by our own route with its own caching; next/image would re-encode SVGs
    <img
      src={`/opponents/${opponent._id}/logo?v=${encodeURIComponent(opponent.logo.key)}`}
      alt={`${opponent.name} logo`}
      width={size}
      height={size}
      className="object-contain"
      style={{ width: size, height: size }}
    />
  );
}
