export type PlayerFormState = {
  errors: Record<string, string[] | undefined>;
};

export const initialPlayerFormState: PlayerFormState = {
  errors: {},
};
