"use client";

import Link from "next/link";
import { formatDistance } from "@/lib/geo";
import type { Shrine } from "@/lib/types";

export default function ShrineCard({
  shrine,
  distance,
  visited,
  visitCount,
  href,
}: {
  shrine: Shrine;
  distance?: number | null;
  visited?: boolean;
  visitCount?: number;
  href?: string;
}) {
  const link = href ?? `/shrines/${shrine.id}`;
  return (
    <Link href={link} className="wa-card flex items-stretch gap-3 p-3 active:bg-washi-deep/40">
      <div
        className="w-[68px] shrink-0 rounded-[10px] bg-washi-deep"
        style={{
          backgroundImage: `url(${shrine.image_url})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
        aria-hidden
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-start gap-2">
          <p className="font-mincho flex-1 text-[1.06rem] leading-snug font-semibold">
            {shrine.name}
          </p>
          {visited && <span className="badge-visited shrink-0">✓ 参拝済</span>}
        </div>
        <p className="mt-1 text-[0.8rem] text-sumi-mute">
          {shrine.prefecture}・{shrine.main_deity.split("・")[0]}
        </p>
        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.78rem] text-sumi-soft">
          {typeof distance === "number" && (
            <span className="font-semibold text-shu">現在地から {formatDistance(distance)}</span>
          )}
          {typeof visitCount === "number" && <span>あなたの参拝 {visitCount}回</span>}
          <span>記録 {shrine.visit_count.toLocaleString("ja-JP")}件</span>
        </div>
      </div>
      <span className="self-center text-sumi-mute" aria-hidden>
        ›
      </span>
    </Link>
  );
}
