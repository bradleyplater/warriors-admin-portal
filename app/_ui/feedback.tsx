import type { ComponentProps, ReactNode } from "react";

// Badge (core/Badge) and Message (feedback/Message). Colour never carries
// meaning alone: the tone supplies a glyph, and the word beside it carries
// the meaning, so the glyph is aria-hidden.

export type Tone = "success" | "warning" | "danger" | "info" | "neutral";

const GLYPHS: Record<Tone, string> = {
  success: "✓",
  warning: "!",
  danger: "✕",
  info: "i",
  neutral: "—",
};

export function Badge({
  tone = "neutral",
  glyph,
  className,
  children,
  ...rest
}: {
  tone?: Tone;
  // null suppresses the glyph, for a label that is not a status ("Current").
  glyph?: string | null;
} & ComponentProps<"span">) {
  const mark = glyph === null ? null : (glyph ?? GLYPHS[tone]);
  return (
    <span
      className={["wr-badge", `wr-badge--${tone}`, className]
        .filter(Boolean)
        .join(" ")}
      {...rest}
    >
      {mark && <span aria-hidden="true">{mark}</span>}
      {children}
    </span>
  );
}

export function Message({
  tone = "info",
  title,
  className,
  children,
  ...rest
}: {
  tone?: Exclude<Tone, "neutral">;
  title?: ReactNode;
} & ComponentProps<"div">) {
  return (
    <div
      role={tone === "danger" ? "alert" : "status"}
      className={["wr-message", `wr-message--${tone}`, className]
        .filter(Boolean)
        .join(" ")}
      {...rest}
    >
      <span aria-hidden="true" className="wr-message__glyph">
        {GLYPHS[tone]}
      </span>
      <div>
        {title && <strong className="wr-message__title">{title}</strong>}
        {children && <p className="wr-message__body">{children}</p>}
      </div>
    </div>
  );
}
