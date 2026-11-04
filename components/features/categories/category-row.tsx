"use client";

import { useActionState, useState, useTransition } from "react";
import {
  deleteCategoryAction,
  renameCategoryAction,
} from "@/app/(dashboard)/dashboard/categories/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TableCell, TableRow } from "@/components/ui/table";
import type { ActionState } from "@/lib/actions/result";
import { uz } from "@/lib/i18n/uz";

type Props = {
  category: { id: string; name: string; productCount: number };
  canManage: boolean;
};

export function CategoryRow({ category, canManage }: Props) {
  const [editing, setEditing] = useState(false);
  const [deleteError, setDeleteError] = useState<string>();
  const [deleting, startDelete] = useTransition();
  const [state, renameAction, renaming] = useActionState<ActionState, FormData>(
    async (prev, formData) => {
      const result = await renameCategoryAction(category.id, prev, formData);
      if (result.ok) setEditing(false);
      return result;
    },
    {},
  );
  const renameError = state.fieldErrors?.name ?? state.error;

  function handleDelete() {
    if (!window.confirm(uz.categories.confirmDelete)) return;
    startDelete(async () => {
      const result = await deleteCategoryAction(category.id);
      setDeleteError(result.error);
    });
  }

  return (
    <TableRow>
      <TableCell>
        {editing ? (
          <form action={renameAction} className="flex flex-col gap-1">
            <div className="flex gap-2">
              <Input
                name="name"
                aria-label={uz.categories.name}
                defaultValue={state.values?.name ?? category.name}
                aria-invalid={!!renameError}
                autoFocus
              />
              <Button type="submit" size="sm" disabled={renaming}>
                {uz.common.save}
              </Button>
              <Button type="button" size="sm" variant="ghost" onClick={() => setEditing(false)}>
                {uz.common.cancel}
              </Button>
            </div>
            {renameError && <p className="text-sm text-destructive">{renameError}</p>}
          </form>
        ) : (
          <span className="font-medium">{category.name}</span>
        )}
        {deleteError && <p className="mt-1 text-sm text-destructive">{deleteError}</p>}
      </TableCell>
      <TableCell className="text-right tabular-nums">{category.productCount}</TableCell>
      {canManage && (
        <TableCell className="text-right">
          {!editing && (
            <div className="flex justify-end gap-2">
              <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
                {uz.common.edit}
              </Button>
              <Button size="sm" variant="destructive" onClick={handleDelete} disabled={deleting}>
                {uz.common.delete}
              </Button>
            </div>
          )}
        </TableCell>
      )}
    </TableRow>
  );
}
