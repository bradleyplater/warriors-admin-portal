import { PublishButton } from "./PublishButton";
import { PublishStatus } from "./PublishStatus";

export function PublishBar() {
  return (
    <div className="flex items-center gap-3">
      <PublishStatus />
      <PublishButton />
    </div>
  );
}
