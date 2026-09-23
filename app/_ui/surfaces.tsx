import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

// Card (core/Card), Stripe (core/Stripe) and the page/section heading
// patterns every admin screen repeats (the design's SectionHead block).

export function Card({
  flush = false,
  className,
  ...rest
}: { flush?: boolean } & ComponentProps<"div">) {
  return (
    <div
      className={["wr-card", flush && "wr-card--flush", className]
        .filter(Boolean)
        .join(" ")}
      {...rest}
    />
  );
}

// The club's signature device: full-bleed, between major regions only —
// never inside a card, never as an underline.
export function Stripe() {
  return <div role="presentation" className="wr-stripe" />;
}

// Page title block: an optional back link or eyebrow above an expanded
// display heading, with the page's actions aligned to the right.
export function PageHeader({
  title,
  eyebrow,
  back,
  meta,
  actions,
  children,
}: {
  title: ReactNode;
  eyebrow?: string;
  back?: { href: string; label: string };
  // A mono line of peer facts under the title (date · type · location).
  meta?: ReactNode;
  actions?: ReactNode;
  // Intro copy under the title, held to the reading measure.
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-6">
      <div className="flex min-w-0 flex-col gap-2">
        {back && (
          <Link href={back.href} className="self-start text-sm">
            {back.label}
          </Link>
        )}
        {eyebrow && (
          <span className="t-label block text-fg-secondary">{eyebrow}</span>
        )}
        <h1 className="t-display text-[length:var(--wr-text-h1)]">{title}</h1>
        {meta && <p className="t-data m-0 text-fg-secondary">{meta}</p>}
        {children && (
          <p className="m-0 mt-1 max-w-measure text-fg-secondary">{children}</p>
        )}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

// Section heading with an optional mono count beside it. The count sits
// outside the heading element so the heading's accessible name is just its
// title ("25/26", not "25/26 3 games").
export function SectionHeading({
  as: Heading = "h2",
  count,
  countTestId,
  actions,
  children,
}: {
  as?: "h2" | "h3";
  count?: ReactNode;
  countTestId?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div className="flex items-baseline gap-3">
        <Heading
          className={`t-heading ${
            Heading === "h2"
              ? "text-[length:var(--wr-text-h2)]"
              : "text-[length:var(--wr-text-h3)]"
          }`}
        >
          {children}
        </Heading>
        {count !== undefined && (
          <span className="t-data text-fg-secondary" data-testid={countTestId}>
            {count}
          </span>
        )}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return (
    <Card>
      <p className="m-0 text-fg-secondary">{children}</p>
    </Card>
  );
}
