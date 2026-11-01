export type AwardFormState = {
  errors: Record<string, string[] | undefined>;
};

export const initialAwardFormState: AwardFormState = {
  errors: {},
};
