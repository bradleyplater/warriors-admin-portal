import { Message } from "@/app/_ui";

// Progress through one review screen: a success message once the screen's
// own completion rule is met, otherwise the done/total count over a bar.
export function ReviewProgress({
  complete,
  done = 0,
  total = 0,
  noun = "",
  completeTitle,
  completeMessage,
}: {
  complete: boolean;
  done?: number;
  total?: number;
  // "resolved", "reviewed"
  noun?: string;
  completeTitle: string;
  completeMessage: string;
}) {
  if (complete) {
    return (
      <Message tone="success" title={completeTitle} className="max-w-2xl">
        {completeMessage}
      </Message>
    );
  }

  const percent = total === 0 ? 0 : Math.round((done / total) * 100);
  return (
    <div className="flex max-w-md flex-col gap-2">
      <p className="m-0 flex items-baseline gap-2">
        <span className="t-data wr-strong text-base">
          {done}/{total}
        </span>
        <span className="t-label text-fg-secondary">{noun}</span>
      </p>
      <div
        role="progressbar"
        aria-label={`${done} of ${total} ${noun}`}
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={done}
        className="h-1 overflow-hidden rounded-xs bg-sunken"
      >
        <div
          className="h-full bg-[color:var(--action-bg)]"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
