import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Opponent logos (5 MB cap, lib/opponent-logos.ts) and game photos
      // (25 MB cap, lib/game-photos.ts) are uploaded through server actions,
      // photos one file per call (add-game-photos design D3). Set just above
      // the larger cap so an oversized file gets the app's own error rather
      // than a framework rejection. The portal only runs locally, so there's
      // no hosting request cap to stay under.
      bodySizeLimit: "26mb",
    },
  },
};

export default nextConfig;
