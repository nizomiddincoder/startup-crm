"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { formValues, toActionState, type ActionState } from "@/lib/actions/result";
import { requireUser } from "@/lib/auth/session";
import { t, uz } from "@/lib/i18n/uz";
import {
  createNews,
  deleteNews,
  publishNews,
  updateNews,
  type NewsImage,
} from "@/lib/services/news";
import { newsSender } from "@/lib/services/telegram/outbox";

const requireAdmin = () => requireUser(["SUPER_ADMIN"]);

/** Rasm (ixtiyoriy) — sharp faqat kerak bo'lganda yuklanadi (actions moduli yengil qolsin). */
async function imageFrom(formData: FormData): Promise<NewsImage> {
  if (formData.get("removeImage") === "on") return null;
  const file = formData.get("image");
  if (!(file instanceof File) || file.size === 0) return undefined;
  const { assertUpload, normalizeOriginal } = await import("@/lib/services/images/process");
  assertUpload(file);
  return {
    data: await normalizeOriginal(Buffer.from(await file.arrayBuffer())),
    mime: "image/webp",
  };
}

function revalidateAll() {
  revalidatePath("/admin/news");
  revalidatePath("/yangiliklar");
  revalidatePath("/news");
  revalidatePath("/", "layout");
}

export async function saveNewsAction(
  id: string | null,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();
  const values = formValues(formData);
  const input = { ...values, title: values.title ?? "", body: values.body ?? "" };
  let savedId = id;
  try {
    const image = await imageFrom(formData);
    if (id) await updateNews(id, input, image);
    else savedId = (await createNews(input, image)).id;
  } catch (error) {
    return toActionState(error, values);
  }
  revalidateAll();
  if (!id) redirect(`/admin/news/${savedId}`);
  return { ok: true };
}

export async function publishNewsAction(id: string): Promise<ActionState> {
  await requireAdmin();
  try {
    const result = await publishNews(id, newsSender());
    revalidateAll();
    return {
      ok: true,
      message: t(uz.news.publishDone, {
        channel: result.channel ? uz.news.yes : uz.news.no,
        owners: result.owners,
      }),
    };
  } catch (error) {
    return toActionState(error);
  }
}

export async function deleteNewsAction(id: string) {
  await requireAdmin();
  await deleteNews(id);
  revalidateAll();
  redirect("/admin/news");
}
