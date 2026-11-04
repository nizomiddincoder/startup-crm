"use client";

import { Megaphone, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { marketing as m } from "@/lib/i18n/marketing.uz";

/**
 * Saytning eng tepasidagi yangilik posteri (oxirgi 14 kun). Yopilsa — shu yangilik shu
 * brauzerda boshqa chiqmaydi. Birinchi chizishda ko'rinadi (sahifa siljimaydi).
 */
export function NewsPoster({ post }: { post: { id: string; title: string } }) {
  const key = `news-poster-closed:${post.id}`;
  const [closed, setClosed] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem(key)) setClosed(true);
    } catch {}
  }, [key]);

  if (closed) return null;
  return (
    <div className="bg-primary text-primary-foreground" data-testid="news-poster">
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-2 text-sm">
        <Megaphone className="size-4 shrink-0" aria-hidden />
        <span className="shrink-0 rounded-md bg-primary-foreground/15 px-2 py-0.5 text-xs font-semibold">
          {m.news.posterLabel}
        </span>
        <Link
          href={`/yangiliklar/${post.id}`}
          className="min-w-0 flex-1 truncate font-medium hover:underline"
        >
          {post.title}
        </Link>
        <Link
          href={`/yangiliklar/${post.id}`}
          className="hidden shrink-0 font-semibold underline sm:inline"
        >
          {m.news.posterMore}
        </Link>
        <button
          type="button"
          aria-label={m.news.posterClose}
          onClick={() => {
            try {
              localStorage.setItem(key, "1");
            } catch {}
            setClosed(true);
          }}
          className="shrink-0 rounded-md p-1 opacity-80 hover:opacity-100"
        >
          <X className="size-4" />
        </button>
      </div>
    </div>
  );
}
