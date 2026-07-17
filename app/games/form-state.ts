export type GameFormState = {
  errors: Record<string, string[] | undefined>;
};

export const initialGameFormState: GameFormState = {
  errors: {},
};
