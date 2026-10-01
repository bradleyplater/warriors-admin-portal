"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  createOpponentWithLogo,
  deleteOpponentIfUnreferenced,
  logoFromFormData,
  updateOpponentWithLogo,
} from "@/lib/opponents/service";
import {
  describeBlockedOpponentDelete,
  type OpponentFormState,
} from "./form-state";

// Opponent names show on the games list and detail pages, so any change
// here must refresh those too.
function revalidateOpponentViews() {
  revalidatePath("/opponents");
  revalidatePath("/games", "layout");
}

export async function createOpponentAction(
  _prevState: OpponentFormState,
  formData: FormData,
): Promise<OpponentFormState> {
  const result = await createOpponentWithLogo(
    formData.get("name"),
    logoFromFormData(formData.get("logo")),
  );
  if (!result.ok) {
    return { errors: result.errors };
  }

  revalidateOpponentViews();
  redirect("/opponents");
}

export async function updateOpponentAction(
  id: string,
  _prevState: OpponentFormState,
  formData: FormData,
): Promise<OpponentFormState> {
  const result = await updateOpponentWithLogo(
    id,
    formData.get("name"),
    logoFromFormData(formData.get("logo")),
  );
  if (!result.ok) {
    return { errors: result.errors };
  }

  revalidateOpponentViews();
  redirect("/opponents");
}

export async function deleteOpponentAction(
  id: string,
  _prevState: OpponentFormState,
): Promise<OpponentFormState> {
  const result = await deleteOpponentIfUnreferenced(id);
  if (!result.ok) {
    return {
      errors: {
        form: [
          describeBlockedOpponentDelete(
            result.referencingGameCount,
            result.referencingUpcomingGameCount,
          ),
        ],
      },
    };
  }

  revalidateOpponentViews();
  redirect("/opponents");
}
