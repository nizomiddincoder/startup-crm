"use client";

import { useActionState, useState, useTransition } from "react";
import { deleteNewsAction, publishNewsAction, saveNewsAction } from "@/app/admin/news/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ActionState } from "@/lib/actions/result";
import { uz } from "@/lib/i18n/uz";
import { cn } from "@/lib/utils";

type Defaults = {
  title: string;
  body: string;
  onSite: boolean;
  onApp: boolean;
  toChannel: boolean;
  toOwners: boolean;
};

type Props = {
  id: string | null;
  defaults: Defaults;
  imageUrl: string | null;
  published: boolean;
  channelConfigured: boolean;
};

/** Admin: yangilik matni, rasm, qayerda chiqishi; saqlash va chop etish (bir marta yuboriladi). */
export function NewsForm({ id, defaults, imageUrl, published, channelConfigured }: Props) {
  const [state, save, saving] = useActionState<ActionState, FormData>(
    saveNewsAction.bind(null, id),
    {},
  );
  const [publishState, setPublishState] = useState<ActionState>({});
  const [publishing, start] = useTransition();
  const v = state.values;
  const checked = (key: keyof Defaults) => (v ? v[key] === "on" : (defaults[key] as boolean));

  const flags = [
    { key: "onSite", label: uz.news.onSite },
    { key: "onApp", label: uz.news.onApp },
    {
      key: "toChannel",
      label: channelConfigured
        ? uz.news.toChannel
        : `${uz.news.toChannel} — ${uz.news.channelMissing}`,
    },
    { key: "toOwners", label: uz.news.toOwners },
  ] as const;

  return (
    <div className="flex max-w-2xl flex-col gap-5">
      <form
        action={save}
        className="flex flex-col gap-4 rounded-2xl border bg-card p-5 shadow-card"
      >
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="news-title">{uz.news.fieldTitle}</Label>
          <Input
            id="news-title"
            name="title"
            defaultValue={v?.title ?? defaults.title}
            aria-invalid={!!state.fieldErrors?.title}
          />
          {state.fieldErrors?.title && (
            <p className="text-sm text-destructive">{state.fieldErrors.title}</p>
          )}
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="news-body">{uz.news.fieldBody}</Label>
          <textarea
            id="news-body"
            name="body"
            rows={8}
            defaultValue={v?.body ?? defaults.body}
            aria-invalid={!!state.fieldErrors?.body}
            className={cn(
              "w-full rounded-lg border border-input bg-card px-3 py-2 text-sm outline-none",
              "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
            )}
          />
          <p className="text-xs text-muted-foreground">{uz.news.bodyHint}</p>
          {state.fieldErrors?.body && (
            <p className="text-sm text-destructive">{state.fieldErrors.body}</p>
          )}
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="news-image">{uz.news.image}</Label>
          {imageUrl && (
            // eslint-disable-next-line @next/next/no-img-element -- o'z route'imizdan
            <img src={imageUrl} alt="" className="max-h-48 self-start rounded-xl border" />
          )}
          <input
            id="news-image"
            name="image"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="text-sm"
          />
          {imageUrl && (
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="removeImage" className="size-4 accent-primary" />
              {uz.news.removeImage}
            </label>
          )}
          {state.fieldErrors?.image && (
            <p className="text-sm text-destructive">{state.fieldErrors.image}</p>
          )}
        </div>
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 text-sm font-semibold">{uz.news.where}</legend>
          {flags.map((f) => (
            <label key={f.key} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name={f.key}
                defaultChecked={checked(f.key)}
                className="size-4 accent-primary"
              />
              {f.label}
            </label>
          ))}
        </fieldset>
        {state.error && <p className="text-sm text-destructive">{state.error}</p>}
        {state.ok && <p className="text-sm text-primary">{uz.common.save} ✓</p>}
        <div className="flex flex-wrap gap-2">
          <Button type="submit" disabled={saving}>
            {saving ? uz.pos.saving : uz.news.save}
          </Button>
          {id && (
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                if (window.confirm(uz.news.confirmDelete)) void deleteNewsAction(id);
              }}
            >
              {uz.news.delete}
            </Button>
          )}
        </div>
      </form>

      {id && !published && (
        <div className="flex flex-col gap-2 rounded-2xl border border-primary/30 bg-accent p-5">
          <Button
            size="lg"
            disabled={publishing}
            onClick={() => {
              if (!window.confirm(uz.news.confirmPublish)) return;
              start(async () => setPublishState(await publishNewsAction(id)));
            }}
          >
            {publishing ? uz.pos.saving : uz.news.publish}
          </Button>
          {publishState.error && <p className="text-sm text-destructive">{publishState.error}</p>}
        </div>
      )}
      {publishState.message && (
        <p role="status" className="text-sm font-semibold text-primary">
          {publishState.message}
        </p>
      )}
    </div>
  );
}
