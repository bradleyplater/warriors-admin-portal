import type { ComponentProps, ReactNode } from "react";
import { Message } from "./feedback";

// TextField and SelectField (forms/*), plus the checkbox/radio group and
// error-list pieces the admin forms need. Every input keeps a visible
// uppercase label; errors are glyph + sentence, never colour alone.

export function FieldErrors({
  id,
  messages,
}: {
  id?: string;
  messages?: string[];
}) {
  if (!messages || messages.length === 0) return null;
  return (
    <div id={id} className="flex flex-col gap-1">
      {messages.map((message) => (
        <p key={message} className="wr-field__error">
          <span aria-hidden="true">{"✕"} </span>
          {message}
        </p>
      ))}
    </div>
  );
}

type FieldProps = {
  id: string;
  label: ReactNode;
  errors?: string[];
  hint?: ReactNode;
  // Applied to the wrapper, for width (the minute/second pair).
  className?: string;
};

function describedBy(id: string, errors?: string[], hint?: ReactNode) {
  if (errors && errors.length > 0) return `${id}-errors`;
  if (hint) return `${id}-hint`;
  return undefined;
}

function FieldFooter({ id, errors, hint }: Omit<FieldProps, "label">) {
  if (errors && errors.length > 0) {
    return <FieldErrors id={`${id}-errors`} messages={errors} />;
  }
  if (hint) {
    return (
      <p id={`${id}-hint`} className="wr-field__hint">
        {hint}
      </p>
    );
  }
  return null;
}

export function TextField({
  id,
  label,
  errors,
  hint,
  className,
  ...inputProps
}: FieldProps & Omit<ComponentProps<"input">, "id" | "className">) {
  const invalid = errors !== undefined && errors.length > 0;
  return (
    <div className={["wr-field", className].filter(Boolean).join(" ")}>
      <label htmlFor={id} className="wr-field__label">
        {label}
      </label>
      <input
        id={id}
        className="wr-input"
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy(id, errors, hint)}
        {...inputProps}
      />
      <FieldFooter id={id} errors={errors} hint={hint} />
    </div>
  );
}

export function SelectField({
  id,
  label,
  errors,
  hint,
  className,
  children,
  ...selectProps
}: FieldProps & Omit<ComponentProps<"select">, "id" | "className">) {
  const invalid = errors !== undefined && errors.length > 0;
  return (
    <div className={["wr-field", className].filter(Boolean).join(" ")}>
      <label htmlFor={id} className="wr-field__label">
        {label}
      </label>
      <select
        id={id}
        className="wr-input"
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy(id, errors, hint)}
        {...selectProps}
      >
        {children}
      </select>
      <FieldFooter id={id} errors={errors} hint={hint} />
    </div>
  );
}

export function Fieldset({
  legend,
  errors,
  className,
  children,
}: {
  legend: ReactNode;
  errors?: string[];
  className?: string;
  children: ReactNode;
}) {
  return (
    <fieldset className={["wr-fieldset", className].filter(Boolean).join(" ")}>
      <legend className="wr-field__label mb-2">{legend}</legend>
      {children}
      <FieldErrors messages={errors} />
    </fieldset>
  );
}

// A checkbox or radio with its label wrapped around it, so the whole row is
// the hit target.
export function Choice({
  children,
  className,
  ...inputProps
}: { children: ReactNode; className?: string } & Omit<
  ComponentProps<"input">,
  "className" | "children"
>) {
  return (
    <label className={["wr-choice", className].filter(Boolean).join(" ")}>
      <input {...inputProps} />
      {children}
    </label>
  );
}

// Form actions row: the submit, then a ghost Cancel back to where the admin
// came from.
export function FormActions({ children }: { children: ReactNode }) {
  return <div className="mt-2 flex flex-wrap gap-3">{children}</div>;
}

const COUNT_WORDS = [
  "",
  "One",
  "Two",
  "Three",
  "Four",
  "Five",
  "Six",
  "Seven",
  "Eight",
  "Nine",
];

// Danger summary above a form after a rejected submit: how many fields need
// attention (the messages themselves stay under each field), plus any
// form-level error that belongs to no single field.
export function FormErrorSummary({
  errors,
}: {
  errors: Record<string, string[] | undefined>;
}) {
  const { form, ...fields } = errors;
  const fieldCount = Object.values(fields).filter(
    (messages) => messages && messages.length > 0,
  ).length;

  if (fieldCount === 0 && (!form || form.length === 0)) return null;

  return (
    <div className="flex flex-col gap-3">
      {fieldCount > 0 && (
        <Message
          tone="danger"
          title={`${COUNT_WORDS[fieldCount] ?? fieldCount} ${
            fieldCount === 1 ? "field needs" : "fields need"
          } attention`}
        >
          Nothing has been saved. Each problem is shown under its field.
        </Message>
      )}
      {form?.map((message) => (
        <Message key={message} tone="danger" title="Not saved">
          {message}
        </Message>
      ))}
    </div>
  );
}
