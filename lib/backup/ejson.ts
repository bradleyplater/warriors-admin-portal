import { EJSON } from "bson";
import type { Document } from "mongodb";

// EJSON (not plain JSON) so BSON-specific types — Dates in particular, since
// every collection here has createdAt/updatedAt — round-trip exactly rather
// than degrading to strings.
export function serializeDocuments(documents: Document[]): string {
  return EJSON.stringify(documents);
}

export function deserializeDocuments(content: string): Document[] {
  return EJSON.parse(content) as Document[];
}
