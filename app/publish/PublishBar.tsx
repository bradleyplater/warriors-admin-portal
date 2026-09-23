import { PublishButton } from "./PublishButton";
import { PublishStatus } from "./PublishStatus";

export function PublishBar() {
  return (
    <div className="flex flex-wrap items-center gap-4">
      <PublishStatus />
      <PublishButton />
    </div>
  );
}
