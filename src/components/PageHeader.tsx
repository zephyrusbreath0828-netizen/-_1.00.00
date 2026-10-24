"use client";

import Link from "next/link";
import type { ReactNode } from "react";

export default function PageHeader({
  title,
  subtitle,
  backHref,
  action,
}: {
  title: string;
  subtitle?: string;
  backHref?: string;
  action?: ReactNode;
}) {
  return (
    <header className="bg-mokume pt-safe text-washi">
      <div className="flex items-start gap-3 px-4 pt-4 pb-4">
        {backHref && (
          <Link
            href={backHref}
            className="mt-[2px] flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/15 text-lg"
            aria-label="戻る"
          >
            ‹
          </Link>
        )}
        <div className="min-w-0 flex-1">
          <h1 className="font-mincho text-[1.32rem] leading-tight font-semibold tracking-wide">
            {title}
          </h1>
          {subtitle && <p className="mt-1 text-[0.82rem] leading-snug text-washi/80">{subtitle}</p>}
        </div>
        {action}
      </div>
      <div className="h-[3px] bg-gradient-to-r from-shu via-kin-soft to-transparent" />
    </header>
  );
}
