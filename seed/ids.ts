// Local ID helper scoped to seeding only. Produces IDs matching the
// PREFIX###### scheme (docs/03-data-model.md) without DB-backed collision
// retry — KAN-14 owns the real shared generator application code will use.

const issued = new Set<string>();

export function genId(prefix: string): string {
  let id: string;
  do {
    const digits = Math.floor(Math.random() * 1_000_000)
      .toString()
      .padStart(6, "0");
    id = `${prefix}${digits}`;
  } while (issued.has(id));
  issued.add(id);
  return id;
}
