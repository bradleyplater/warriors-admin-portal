export type SeasonFormState = {
  errors: Record<string, string[] | undefined>;
};

export const initialSeasonFormState: SeasonFormState = {
  errors: {},
};
