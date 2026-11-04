"use client";

import { useActionState } from "react";
import { createCategoryAction } from "@/app/(dashboard)/dashboard/categories/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { ActionState } from "@/lib/actions/result";
import { uz } from "@/lib/i18n/uz";

export function CategoryCreateForm() {
  const [state, action, pending] = useActionState<ActionState, FormData>(createCategoryAction, {});
  const error = state.fieldErrors?.name ?? state.error;

  return (
    <form action={action} className="flex flex-col gap-2">
      <div className="flex gap-2">
        <Input
          name="name"
          aria-label={uz.categories.name}
          placeholder={uz.categories.namePlaceholder}
          defaultValue={state.ok ? "" : state.values?.name}
          aria-invalid={!!error}
          className="max-w-sm"
        />
        <Button type="submit" disabled={pending}>
          {uz.categories.add}
        </Button>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </form>
  );
}
