"use server";

import { revalidatePath } from "next/cache";
import { runPublish } from "@/lib/publish/run";
import type { PublishFormState } from "./publish-state";

export async function publishAction(
  _prevState: PublishFormState,
  _formData: FormData,
): Promise<PublishFormState> {
  try {
    await runPublish();
  } catch (error) {
    // runPublish() has already recorded the failed attempt as a Publishes
    // document (see lib/publish/run.ts) — this just surfaces the reason to
    // the admin who pressed the button.
    return {
      status: "error",
      message: error instanceof Error ? error.message : "Publish failed.",
    };
  }

  // Every page shares the header this control lives in, so the whole
  // layout needs to re-render for the indicator to clear immediately.
  revalidatePath("/", "layout");
  return { status: "success" };
}
