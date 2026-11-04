"use client";

import { ImagePlus, Sparkles, Trash2, Wand2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import {
  productImageAiAction,
  removeProductImageAction,
  uploadProductImageAction,
} from "@/app/(dashboard)/dashboard/products/actions";
import { Button } from "@/components/ui/button";
import { t, uz } from "@/lib/i18n/uz";

type Source = keyof typeof uz.images.sources;

type Props = {
  productId: string;
  imageVersion: number;
  original: { source: Source } | null;
  standard: { source: Source } | null;
  ai: { enabled: boolean; left: number };
};

/**
 * Mahsulot rasmi: yuklash (telefon kamerasi ham), AI bilan yaratish yoki chiroyli qilish, o'chirish.
 * Chapda — kassada ko'rinadigan (standart), o'ngda — yuklangan asl rasm.
 */
export function ProductImageEditor({ productId, imageVersion, original, standard, ai }: Props) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState<"upload" | "generate" | "standardize" | "remove" | null>(null);
  const [, start] = useTransition();
  const aiReady = ai.enabled && ai.left > 0;

  function run(
    kind: NonNullable<typeof busy>,
    fn: () => Promise<{
      ok?: boolean;
      error?: string;
      fieldErrors?: Record<string, string | undefined>;
    }>,
  ) {
    setError(undefined);
    setBusy(kind);
    start(async () => {
      const res = await fn();
      setBusy(null);
      if (!res.ok) return setError(res.error ?? res.fieldErrors?.image);
      router.refresh();
    });
  }

  function upload(file: File) {
    const data = new FormData();
    data.set("image", file);
    if (aiReady) data.set("standardize", "on");
    run("upload", () => uploadProductImageAction(productId, data));
  }

  const src = (kind?: "original") =>
    `/media/products/${productId}?v=${imageVersion}${kind ? "&kind=original" : ""}`;

  return (
    <section
      className="flex max-w-xl flex-col gap-4 rounded-2xl border bg-card p-5 shadow-card"
      data-testid="product-image"
    >
      <div className="flex flex-col gap-1">
        <h2 className="font-bold">{uz.images.title}</h2>
        <p className="text-sm text-muted-foreground">{uz.images.hint}</p>
      </div>

      <div className="flex flex-wrap gap-4">
        <figure className="flex flex-col items-center gap-1.5">
          {standard ? (
            // eslint-disable-next-line @next/next/no-img-element -- o'z route'imizdan
            <img
              src={src()}
              alt={uz.images.standard}
              className="size-36 rounded-xl border bg-white object-contain"
              data-testid="image-standard"
            />
          ) : (
            <div className="flex size-36 items-center justify-center rounded-xl border border-dashed text-sm text-muted-foreground">
              {uz.images.none}
            </div>
          )}
          <figcaption className="text-center text-xs text-muted-foreground">
            {uz.images.standard}
            {standard && <span className="block">{uz.images.sources[standard.source]}</span>}
          </figcaption>
        </figure>
        {original && (
          <figure className="flex flex-col items-center gap-1.5">
            {/* eslint-disable-next-line @next/next/no-img-element -- o'z route'imizdan */}
            <img
              src={src("original")}
              alt={uz.images.original}
              className="size-36 rounded-xl border bg-muted object-cover"
            />
            <figcaption className="text-xs text-muted-foreground">{uz.images.original}</figcaption>
          </figure>
        )}
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
        capture="environment"
        className="sr-only"
        aria-label={uz.images.upload}
        data-testid="image-input"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) upload(file);
          e.target.value = "";
        }}
      />

      <div className="flex flex-wrap gap-2">
        <Button type="button" disabled={!!busy} onClick={() => fileRef.current?.click()}>
          <ImagePlus className="size-4" />
          {standard ? uz.images.replace : uz.images.upload}
        </Button>
        {aiReady && !original && (
          <Button
            type="button"
            variant="outline"
            disabled={!!busy}
            onClick={() => run("generate", () => productImageAiAction(productId, "generate"))}
          >
            <Sparkles className="size-4" />
            {uz.images.generate}
          </Button>
        )}
        {aiReady && original && (
          <Button
            type="button"
            variant="outline"
            disabled={!!busy}
            title={uz.images.standardizeHint}
            onClick={() => run("standardize", () => productImageAiAction(productId, "standardize"))}
          >
            <Wand2 className="size-4" />
            {uz.images.standardize}
          </Button>
        )}
        {standard && (
          <Button
            type="button"
            variant="ghost"
            disabled={!!busy}
            onClick={() => {
              if (window.confirm(uz.images.confirmRemove)) {
                run("remove", () => removeProductImageAction(productId));
              }
            }}
          >
            <Trash2 className="size-4" />
            {uz.images.remove}
          </Button>
        )}
      </div>

      <p className="text-xs text-muted-foreground" role="status">
        {busy === "generate" || busy === "standardize"
          ? uz.images.working
          : !ai.enabled
            ? uz.images.aiDisabled
            : ai.left > 0
              ? t(uz.images.left, { count: ai.left })
              : uz.images.aiLimit}
      </p>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </section>
  );
}
