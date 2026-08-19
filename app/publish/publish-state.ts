export type PublishFormState = {
  status: "idle" | "success" | "error";
  message?: string;
};

export const initialPublishFormState: PublishFormState = {
  status: "idle",
};
