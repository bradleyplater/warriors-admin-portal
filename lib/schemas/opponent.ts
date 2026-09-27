import { z } from "zod";

export const OPPONENT_ID_PATTERN = /^OPN\d{6}$/;

export const OpponentIdSchema = z
  .string({ error: "Opponent is required" })
  .regex(OPPONENT_ID_PATTERN, "Opponent is required");

// The only image types a logo may be. The stored contentType is what the
// logo is uploaded to S3 with (so browsers render it correctly), and the
// key's extension is always derived from it — never from the uploaded
// filename — so the two can't disagree.
export const LOGO_EXTENSIONS = {
  "image/svg+xml": "svg",
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
} as const;

export type LogoContentType = keyof typeof LOGO_EXTENSIONS;

export const LogoContentTypeSchema = z.enum(
  Object.keys(LOGO_EXTENSIONS) as [LogoContentType, ...LogoContentType[]],
  { error: "Logo must be an SVG, PNG, JPEG, or WebP image" },
);

export function logoExtensionFor(contentType: LogoContentType): string {
  return LOGO_EXTENSIONS[contentType];
}

const LogoSchema = z
  .object({
    // Bare S3 object key (e.g. "opponents/OPN123456/logo-1759000000000.svg"),
    // not a URL — same portability reasoning as Player.imagePath.
    key: z.string().min(1),
    contentType: LogoContentTypeSchema,
  })
  .superRefine((logo, ctx) => {
    const extension = LOGO_EXTENSIONS[logo.contentType];
    if (extension && !logo.key.endsWith(`.${extension}`)) {
      ctx.addIssue({
        code: "custom",
        message: `Logo key must end in .${extension} for ${logo.contentType}`,
        path: ["key"],
      });
    }
  });
export type OpponentLogo = z.infer<typeof LogoSchema>;

const OpponentShape = z.object({
  _id: z.string().regex(OPPONENT_ID_PATTERN), // "OPN######"
  name: z.string().trim().min(1, "Name is required"),
  logo: LogoSchema.optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const OpponentSchema = OpponentShape;
export type Opponent = z.infer<typeof OpponentSchema>;

export const OpponentCreateInputSchema = OpponentShape.omit({
  _id: true,
  createdAt: true,
  updatedAt: true,
});
export type OpponentCreateInput = z.infer<typeof OpponentCreateInputSchema>;
