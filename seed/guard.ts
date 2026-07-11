// Shared local-only guard rail for the seed and reset entry points.
// A copied command should never silently wipe a non-local database.

const ALLOWED_HOSTS = new Set(["localhost", "127.0.0.1", "mongo"]);

export function assertLocalOrAllowed(uri: string, argv: string[]): void {
  if (argv.includes("--allow-remote")) {
    return;
  }

  let hostname: string;
  try {
    hostname = new URL(uri).hostname;
  } catch {
    throw new Error(
      `MONGODB_URI is not a valid URI: "${uri}". Refusing to run without --allow-remote.`,
    );
  }

  if (!ALLOWED_HOSTS.has(hostname)) {
    throw new Error(
      `MONGODB_URI host "${hostname}" does not look local (expected one of: ${[...ALLOWED_HOSTS].join(", ")}). ` +
        `Pass --allow-remote to run against it anyway.`,
    );
  }
}
