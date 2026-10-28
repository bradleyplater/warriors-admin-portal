export type PhotoTextFormState = {
  errors: Record<string, string[] | undefined>;
  saved: boolean;
};

export const initialPhotoTextFormState: PhotoTextFormState = {
  errors: {},
  saved: false,
};
