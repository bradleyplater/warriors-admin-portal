import { getPublishStatus } from "@/lib/publish/status";

// The shell must still render every page with no database available (see
// openspec/specs/portal-shell's "Runs without backing services" scenario) —
// this is the one component in the shared header that touches the
// database, so it fails closed (hides the indicator) instead of throwing
// and taking the whole shell down with it.
export async function PublishStatus() {
  let hasUnpublishedChanges: boolean;
  try {
    ({ hasUnpublishedChanges } = await getPublishStatus());
  } catch {
    return null;
  }

  return (
    <span
      data-testid="publish-status"
      data-state={hasUnpublishedChanges ? "unpublished" : "up-to-date"}
      className={`flex items-center gap-1.5 text-sm ${
        hasUnpublishedChanges
          ? "text-amber-600 dark:text-amber-400"
          : "text-black/60 dark:text-white/60"
      }`}
    >
      <span
        aria-hidden
        className={`h-2 w-2 rounded-full ${
          hasUnpublishedChanges ? "bg-amber-500" : "bg-green-500"
        }`}
      />
      {hasUnpublishedChanges ? "Unpublished changes" : "Up to date"}
    </span>
  );
}
