import Link from "next/link";
import type { ComponentProps } from "react";

// Button (core/Button). Primary is the navy action — one per view where
// possible; secondary, ghost and danger carry everything else. There are no
// icon-only buttons in this system: every button has a word.

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

type StyleProps = {
  variant?: ButtonVariant;
  size?: ButtonSize;
};

export function buttonClass({
  variant = "primary",
  size = "md",
  className,
}: StyleProps & { className?: string }): string {
  return [
    "wr-btn",
    `wr-btn--${variant}`,
    size === "md" ? null : `wr-btn--${size}`,
    className,
  ]
    .filter(Boolean)
    .join(" ");
}

export function Button({
  variant,
  size,
  className,
  type = "button",
  ...rest
}: StyleProps & ComponentProps<"button">) {
  return (
    <button
      type={type}
      className={buttonClass({ variant, size, className })}
      {...rest}
    />
  );
}

// A navigation that looks like a button — "Add game", "Edit details" — is
// still a link, so it stays an <a> for the accessibility tree.
export function ButtonLink({
  variant,
  size,
  className,
  ...rest
}: StyleProps & ComponentProps<typeof Link>) {
  return (
    <Link className={buttonClass({ variant, size, className })} {...rest} />
  );
}
