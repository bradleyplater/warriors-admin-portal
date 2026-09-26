export default function Home() {
  return (
    <div className="flex flex-col gap-6 pt-6">
      <h1 className="t-display text-[length:var(--wr-text-display)]">
        Warriors <br />
        admin portal
      </h1>
      <p className="m-0 max-w-measure text-fg-secondary">
        Manage players, games and seasons for the Warriors, and publish the
        results to the public website.
      </p>
    </div>
  );
}
