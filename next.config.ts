import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Opponent logos are uploaded through a server action (add-opponents
      // design D3). Set just above the app's own 5 MB logo cap
      // (lib/opponent-logos.ts) so an oversized file gets the form's
      // field-level error rather than a framework rejection. The portal only
      // runs locally, so there's no hosting request cap to stay under.
      bodySizeLimit: "6mb",
    },
  },
};

export default nextConfig;
