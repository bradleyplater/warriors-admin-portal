import { SiteNav } from "@/app/_ui";

// The three pre-cutover review screens share one top-level nav entry, so
// they carry their own tab row to move between them.
const reviewItems = [
  { href: "/migration-review/reconciliation", label: "Reconciliation" },
  { href: "/migration-review/active", label: "Active flags" },
  { href: "/migration-review/shirt-number", label: "Shirt numbers" },
];

export default function MigrationReviewLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-8">
      <SiteNav
        label="Migration review"
        items={reviewItems}
        className="border-b border-hairline"
      />
      {children}
    </div>
  );
}
