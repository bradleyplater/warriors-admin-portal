export type CreatePlayerFormState = {
  errors: Record<string, string[] | undefined>;
  success: boolean;
  // Bumped on every successful create so the form can key on it and remount
  // (clearing uncontrolled inputs) instead of tracking each field in state.
  resetToken: number;
};

export const initialCreatePlayerFormState: CreatePlayerFormState = {
  errors: {},
  success: false,
  resetToken: 0,
};
