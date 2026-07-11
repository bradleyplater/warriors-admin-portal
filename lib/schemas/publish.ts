import { z } from "zod";

const PublishArtifactSchema = z.object({
  path: z.string(),
  checksum: z.string(),
  changed: z.boolean(),
});

const PublishesShape = z.object({
  _id: z.string(), // "PUB######"
  startedAt: z.date(),
  completedAt: z.date(),
  artifacts: z.array(PublishArtifactSchema),
  status: z.enum(["success", "failed"]),
  error: z.string().optional(),
});

export const PublishesSchema = PublishesShape;
export type Publishes = z.infer<typeof PublishesSchema>;

export const PublishesCreateInputSchema = PublishesShape.omit({ _id: true });
export type PublishesCreateInput = z.infer<typeof PublishesCreateInputSchema>;
