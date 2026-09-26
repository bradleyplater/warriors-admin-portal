import { getPublishStatus } from "@/lib/publish/status";
import { Badge } from "@/app/_ui";

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
    <Badge
      data-testid="publish-status"
      data-state={hasUnpublishedChanges ? "unpublished" : "up-to-date"}
      tone={hasUnpublishedChanges ? "warning" : "success"}
    >
      {hasUnpublishedChanges ? "Unpublished changes" : "Up to date"}
    </Badge>
  );
}
