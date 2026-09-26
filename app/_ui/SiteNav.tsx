"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// SiteNav (navigation/SiteNav). Client only because the active tab comes
// from the current path: an item is current on its own route and any route
// beneath its section.

export type SiteNavItem = {
  href: string;
  label: string;
  // Path prefix that marks the item current; defaults to href.
  section?: string;
};

export function SiteNav({
  items,
  label,
  className,
}: {
  items: SiteNavItem[];
  label: string;
  className?: string;
}) {
  const pathname = usePathname();

  return (
    <nav
      aria-label={label}
      className={["wr-nav", className].filter(Boolean).join(" ")}
    >
      {items.map((item) => {
        const section = item.section ?? item.href;
        const active =
          pathname === section || pathname.startsWith(`${section}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className="wr-nav__link"
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
