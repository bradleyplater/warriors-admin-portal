import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Archivo, Chivo_Mono } from "next/font/google";
import { PublishBar } from "./publish/PublishBar";
import { SiteNav, Stripe } from "./_ui";
import "./globals.css";

// PublishStatus (rendered via PublishBar below) reads the database on
// every request, same reasoning as the force-dynamic pages under
// app/{games,players,seasons} — without it Next would statically
// prerender the shell and freeze the indicator to build time.
export const dynamic = "force-dynamic";

// One superfamily across the width axis: the design system's hierarchy is
// carried by Archivo's wdth axis (75 labels, 100 body, 125 display), so the
// variable font must ship with it. Chivo Mono carries every figure.
const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
  axes: ["wdth"],
});

const chivoMono = Chivo_Mono({
  variable: "--font-chivo-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Warriors Admin Portal",
  description: "Admin portal for managing Warriors players, games and seasons",
};

const navItems = [
  { href: "/players", label: "Players" },
  { href: "/games", label: "Games" },
  { href: "/seasons", label: "Seasons" },
  {
    href: "/migration-review/reconciliation",
    label: "Migration review",
    section: "/migration-review",
  },
];

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // The portal wears the away kit (white), as the admin-portal design
    // specifies. Both kits share token names, so data-theme="home" would
    // restyle the whole portal black.
    <html
      lang="en"
      data-theme="away"
      className={`${archivo.variable} ${chivoMono.variable} h-full`}
    >
      <body className="flex min-h-full flex-col">
        <header className="border-b border-hairline bg-surface">
          <div className="mx-auto flex max-w-page flex-wrap items-center justify-between gap-x-8 gap-y-3 px-8 py-4">
            <Link href="/" className="flex items-center gap-4 no-underline">
              {/* The cutout carries wide transparent margins; 120px is the
                  system's minimum on-screen width, and the negative block
                  margin trims the empty band above and below the script. */}
              <Image
                src="/brand/warriors-logo-black.png"
                alt="Peterborough Warriors"
                width={2048}
                height={1448}
                priority
                className="-my-5 block h-auto w-[120px]"
              />
              <span className="t-label border-l border-hairline pl-4 text-fg-secondary">
                Admin portal
              </span>
            </Link>
            <PublishBar />
          </div>
          <div className="mx-auto max-w-page px-8">
            <SiteNav label="Main" items={navItems} />
          </div>
        </header>
        <Stripe />
        <main className="mx-auto flex w-full max-w-page flex-1 flex-col px-8 pt-10 pb-16">
          {children}
        </main>
      </body>
    </html>
  );
}
